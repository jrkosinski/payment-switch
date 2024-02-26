// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "hardhat/console.sol";

contract PaymentBook 
{
    /*
    mapping is receiver address => an array of payment buckets 
    - bucket 0 is STATE_REVIEW
    - followed by 0-n STATE_PROCESSED buckets
    - followed by 0-n STATE_APPROVED buckets
    - followed by 0-1 STATE_READY buckets 
    - followed by exactly 1 STATE_PENDING bucket 
    
    [review][processed]...[approved]...[ready][pending]
    */
    mapping(address => PaymentBucket[]) internal paymentBuckets;  // receiver address => buckets[]
    mapping(uint256 => PaymentAddress) internal paymentAddresses; // order Id => bucket location (where order is found)
    
    /* Encapsulates information about a payment (not including the receiver, which is the 
    mapping key)
    */
    struct Payment 
    {
        uint256 id;
        address payer;
        uint256 amount;
        uint256 refundAmount;
    }
    
    /* This is just a Payment struct, with an extra 'state' property tacked on. 
        It's used for returning to callers for info, and always as 'memory', never 'storage'.
    */
    struct PaymentWithState 
    {
        uint256 id;
        address payer;
        uint256 amount;
        uint256 refundAmount;
        uint8 state;
    }
    
    /* Identifies the receiver, bucket index, and payment index to locate a paymet by id.
    */
    struct PaymentAddress 
    {
        address receiver;
        uint256 bucketIndex;
        uint256 paymentIndex;
    }
    
    /* Buckets contain payments, and can be pending buckets, ready buckets, approved buckets, etc.
        There are strict rules regarding what buckets can exist and their state transitions. */
    struct PaymentBucket 
    {
        uint256 total;
        uint8 state;
        Payment[] payments;
    }
    
    uint8 constant STATE_PENDING = 1;       //just added
    uint8 constant STATE_READY = 2;         //ready to be approved
    uint8 constant STATE_APPROVED = 3;      //approved, ready to pay out
    uint8 constant STATE_PROCESSED = 4;     //paid out, finished (end state)
    uint8 constant STATE_FOR_REVIEW = 5;    //has been removed for admin review
    
    /**
     * Returns a PaymentWithState structure retrieved by payment id. If the id is invalid, 
     * the call is not reverted; an empty structure will be returned instead. 
     * 
     * @param id Identifies the payment. 
     * @return A struct containing info about the payment, or an empty struct if not found.
     */
    function getPaymentById(uint256 id) public view returns (PaymentWithState memory) {
        PaymentWithState memory output; 
        
        if (_paymentExists(id)) {
            //get the stored payment indicated 
            PaymentAddress memory location = paymentAddresses[id]; 
            PaymentBucket memory bucket = paymentBuckets[location.receiver][location.bucketIndex-1];
            Payment memory payment = bucket.payments[location.paymentIndex-1];
            
            //make a copy with state 
            output.id = payment.id;
            output.payer = payment.payer;
            output.amount = payment.amount;
            output.state = bucket.state;
        }
        
        return output;
    }
    
    /**
     * Gets the first bucket found for the given receiver, counting backwards from the end 
     * of the array, which has the given state.
     * Example: if APPROVED buckets exist from index 8 through 13 inclusive, this call 
     * will return the bucket at index 13 if APPROVED is passed as the state parameter. 
     * 
     * @param receiver The query pertains to buckets for this receiver only.
     * @param state The desired bucket state.
     * 
     * @return The highest-indexed PaymentBucket for the given receiver that has the given state.
     */
    function _getBucketWithState(address receiver, uint8 state) internal view returns (PaymentBucket storage) {
        return paymentBuckets[receiver][_getBucketIndexWithState(receiver, state)-1];
    }
    
    /**
     * Similar to {_getBucketWithState}, but returns the index of the bucket only. 
     * The index is 1-based, to avoid underflow. 0 is returned if no such bucket exists. 
     * If 1 is returned, it indicates the 0th index. If 100 is returned, it's index 99, 
     * and so forth. 
     * 
     * @param receiver The query pertains to buckets for this receiver only.
     * @param state The desired bucket state.
     * 
     * @return The 1-based index of the highest-indexed PaymentBucket for the given receiver 
     * that has the given state.
     */
    function _getBucketIndexWithState(address receiver, uint8 state) internal view returns (uint256) {
        PaymentBucket[] storage buckets = paymentBuckets[receiver]; 
        
        //if there is > 0 buckets, the 0th one should be for review
        if (state == STATE_FOR_REVIEW) {
            if (buckets.length > 0 && buckets[0].state == STATE_FOR_REVIEW) 
                return 1; 
        }
        else {
            for (uint256 n=buckets.length; n>0; n--) {
                
                //at the first of the state, return true 
                if (buckets[n-1].state == state) {
                    return n; 
                }
                    
                //break at first processed one; there will be no more approved past this
                if (buckets[n-1].state == STATE_PROCESSED) 
                    break;
            }
        }
        
        //if here, none were found 
        return 0;
    }
    
    /**
     * Returns true if a payment with the given id exists anywhere, in any bucket for 
     * any receiver. 
     * 
     * @param id The payment id. 
     * 
     * @return True if a payment with the given id exists. 
     */
    function _paymentExists(uint256 id) internal view returns (bool) {
        PaymentAddress memory location = paymentAddresses[id]; 
        return location.receiver != address(0) && location.bucketIndex > 0 && location.paymentIndex > 0;
    }
    
    /**
     * 
     */
    function _getPaymentById(uint256 id) internal view returns (Payment storage) {
        PaymentAddress memory location = paymentAddresses[id]; 
        return paymentBuckets[location.receiver][location.bucketIndex-1].payments[location.paymentIndex-1]; 
    }
    
    /**
     * Gets the total amount that is indicated as locked up for the given receiver in the 
     * specified state. 
     * 
     * For states in which there's only one bucket (e.g. PENDING state), the function will 
     * simply return the total listed for that single bucket. If no bucket exists for the 
     * given state, it will return 0. But for states (APPROVED or PROCESSED) which can have 
     * multiple buckets, it will loop. 
     * It should be noted that this can potentially overflow, as the total (uint256) is 
     * incremented. It's unlikely in real life, but it's technically possible. 
     * 
     * In actual use, there should normally be a limited number of APPROVED buckets but the 
     * number of PROCESSED buckets can just keep growing over time. Therefore, it isn't 
     * recommended to call this with PROCESSED passed for the state. It can potentially 
     * do a lot of looping. 
     * 
     * @param receiver The receiver for whom to calculate bucket totals.
     * @param state The state of the buckets to tally.
     * 
     * @return The total amount in all buckets of the given state for the given receiver.
     */
    function _getTotalInState(address receiver, uint8 state) internal view returns (uint256) {
        uint256 bucketIndex = _getBucketIndexWithState(receiver, state);
        if (bucketIndex > 0) {
            if (state == STATE_FOR_REVIEW || state == STATE_PENDING || state == STATE_READY) {
                return paymentBuckets[receiver][bucketIndex-1].total;
            }
            
            uint256 total = 0;
            PaymentBucket[] memory buckets = paymentBuckets[receiver];
            for (uint256 n=bucketIndex; n>0; n--) {
                if (buckets[n-1].state != state) 
                    break;
                total += buckets[n-1].total;
            }
            
            return total;
        }
        
        return 0;
    }
    
    /**
     * Appends a new PENDING bucket to the end of the buckets array for the given receiver. 
     * The current PENDING bucket (before appending a new one) will be converted to a READY bucket.
     * If a READY bucket already exists, however, then the call will revert. 
     * 
     * @param receiver The receiver for whom to add the bucket.
     */
    function _appendBucket(address receiver) internal {
        PaymentBucket[] storage buckets = paymentBuckets[receiver]; 
        
        //if no buckets yet, first one is review, second is pending 
        if (buckets.length == 0) {
            buckets.push();
            buckets.push();
            buckets[0].state = STATE_FOR_REVIEW;
            buckets[1].state = STATE_PENDING;
        }
        else {
            //not allowed to have two ready buckets at once
            if (buckets.length > 2 && buckets[buckets.length-2].state == STATE_READY)
                revert("no can do"); //TODO: better error 
                
            //pending bucket becomes ready bucket; new bucket is pending
            buckets[buckets.length-1].state = STATE_READY;
            buckets.push();
            buckets[buckets.length-1].state = STATE_PENDING;
        }
    }
    
    //test 3
    /**
     * Adds a payment to the given receiver's pending bucket, if no payment with the given id 
     * exists. 
     * If a payment with the given id exists, then this payment will be added to that one, 
     * with some restrictions. 
     * 
     * If the existing payment is not in a PENDING, READY, or FOR_REVIEW bucket, the call will 
     * revert however. You can't modify payments that are APPROVED or PROCESSED. 
     * 
     * @param receiver The receiver for whom to add the payment.
     * @param id Id of the payment to add.
     * @param payer The address of the payer of the payment. 
     * @param amount The payment amount. 
     */
    function _addPayment(address receiver, uint256 id, address payer, uint256 amount) internal {
        //if no pending bucket exists, add one 
        if (_getBucketIndexWithState(receiver, STATE_PENDING) == 0) {
            _appendBucket(receiver);
        }
        
        //check for duplicate
        uint256 bucketIndex = paymentAddresses[id].bucketIndex;
        if (bucketIndex > 0) {
            //if the bucket it's in is not pending, ready, or review, then revert 
            uint8 bucketState = paymentBuckets[receiver][bucketIndex-1].state;
            if (bucketState != STATE_PENDING && bucketState != STATE_READY && bucketState != STATE_FOR_REVIEW) {
                revert("Order cannot be added to"); //TODO: better revert error
            }
                
            //if duplicate, add to the amount 
            Payment storage payment = _getPaymentById(id); 
            payment.amount += amount;
        
            //get & add to the bucket total 
            PaymentBucket storage bucket = paymentBuckets[receiver][bucketIndex-1];
            bucket.total += amount;
        } else {
            //by default, add to the last bucket (the pending bucket)
            bucketIndex = paymentBuckets[receiver].length; 
            _addPaymentToBucket(receiver, bucketIndex, id, payer, amount);
        }
    }
    
    function _processApprovedBuckets(address receiver) internal {
        uint256 startIndex = _getBucketIndexWithState(receiver, STATE_APPROVED); 
        if (startIndex > 0) {
            for (uint256 n=startIndex; n>0; n--) {
                paymentBuckets[receiver][n-1].state = STATE_PROCESSED;
            }
        }
    }
    
    function _removePayment(uint256 id, bool removeLocation) internal returns (Payment memory) {
        PaymentAddress storage location = paymentAddresses[id]; 
        Payment memory output;
        
        if (location.bucketIndex > 0 && location.paymentIndex > 0) {
            PaymentBucket storage bucket = paymentBuckets[location.receiver][location.bucketIndex-1];
            output = bucket.payments[location.paymentIndex-1];
            
            //zero out the payment
            Payment storage payment = paymentBuckets[location.receiver][location.bucketIndex-1].payments[location.paymentIndex-1];
            uint256 amount = payment.amount;
            payment.payer = address(0);
            payment.amount = 0; 
            payment.id = 0;
            
            //subtract the total 
            bucket.total -= amount;
            
            //remove location 
            if (removeLocation) {
                location.bucketIndex = 0; 
                location.paymentIndex = 0;
                location.receiver = address(0);
            }
        }
        
        return output;
    }
    
    //TODO: should have restrictions for moving payments 
    function _movePayment(uint256 id, uint256 destBucketIndex) internal {
        
        //TODO: check if source == dest bucket
        
        //remove the payment from source bucket
        PaymentAddress storage location = paymentAddresses[id]; 
        Payment memory paymentToMove = _removePayment(id, false); 
        
        if (paymentToMove.amount > 0 && paymentToMove.id == id) {
            
            //add the new record at the destination bucket
            PaymentBucket storage destBucket = paymentBuckets[location.receiver][destBucketIndex-1]; 
            destBucket.payments.push(paymentToMove);
            
            //move the location
            location.bucketIndex = destBucketIndex;
            location.paymentIndex = destBucket.payments.length;
            
            //add the total to dest bucket 
            destBucket.total += paymentToMove.amount;
        }
    }
    
    function _addPaymentToBucket(
        address receiver, 
        uint256 bucketIndex, 
        uint256 id, 
        address payer, 
        uint256 amount
    ) internal {
        //add the new payment record to the specified bucket
        PaymentBucket storage bucket = paymentBuckets[receiver][bucketIndex-1]; 
        bucket.payments.push(Payment(id, payer, amount, 0));
            
        //add the location of the payment for reference
        PaymentAddress memory location; 
        location.receiver = receiver;
        location.bucketIndex = bucketIndex;
        location.paymentIndex = bucket.payments.length;
        paymentAddresses[id] = location;
        
        //add to bucket total
        bucket.total += amount;
    }
}