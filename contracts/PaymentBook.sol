// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "hardhat/console.sol";

//TODO: batch for removed payments (while in dispute or processing) 
//TODO: move removed payment back into a batch 

/**
 * @title PaymentBook 
 * 
 * Encapsulates logic for storing and batching payment information 
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
contract PaymentBook
{
    //TODO: array of buckets. bucket[len-1] is pending, 
    //bucket [len-2] is ready to approve, and all other buckets are approved
    
    /*
    mapping is receiver address => an array of payment buckets 
    the LAST payment bucket is the 'pending' bucket' 
    second to last is 'ready to approve' 
    all subsequent ones are approved 
    this order is enforced 
    */
    mapping(address => PaymentBucket[]) internal paymentBuckets;  // receiver address => buckets[]
    mapping(uint256 => BucketLocation) internal orderIdsToBuckets; // order Id => bucket location (where order is found)
    
    //enum 
    uint8 constant STATE_PENDING = 1;       //just added
    uint8 constant STATE_READY = 2;         //ready to be approved
    uint8 constant STATE_APPROVED = 3;      //approved, ready to pay out
    uint8 constant STATE_PROCESSED = 4;     //paid out, finished (end state)
    uint8 constant STATE_FOR_REVIEW = 5;    //has been removed for admin review
    
    //errors
    error DuplicateEntry();
    
    struct PaymentBucket 
    {
        uint256 total;
        PaymentRecord[] payments;
        uint8 state;
    }
    
    struct BucketLocation 
    {
        address receiver;
        uint256 bucketIndex;
        uint256 paymentIndex;
    }
    
    struct PaymentRecord 
    {
        uint256 orderId;
        address payer;
        uint256 amount;
        bool refunded;
    }
    
    function getPendingPayments(address receiver) public view returns (PaymentBucket memory) {
        if (!_hasPendingBucket(receiver))
            revert("no pending payments");   //TODO: better revert custom error 
            
        return _getPendingBucket(receiver);
    }
    
    function getAmountPending(address receiver) public view returns (uint256) {
        if (_hasPendingBucket(receiver))
            return _getPendingBucket(receiver).total; 
        return 0;
    }
    
    function getAmountApproved(address receiver) public view returns (uint256) {
        PaymentBucket[] storage buckets = paymentBuckets[receiver]; 
        uint256 total = 0;
        
        for (uint256 n=buckets.length; n>0; n--) {
            PaymentBucket storage bucket = buckets[n-1]; 
            if (bucket.state == STATE_APPROVED) {
                total += bucket.total;
            }
            else if (bucket.state > STATE_APPROVED) {
                break;
            }
        }
        
        return total;
    }
    
    //TODO: this function must be private 
    function _pendingToReady(address receiver) internal {
        //there must be a pending bucket for this to work
        if (_hasPendingBucket(receiver)) {
            
            //there must not be a ready bucket already, in order for this to work 
            if (!_hasReadyBucket(receiver)) {
                _appendBucket(receiver);
            }
        }
    }
    
    function _addPendingPayment(address receiver, uint256 orderId, address payer, uint256 amount) internal {
        
        //if no pending bucket exists, add one 
        if (!_hasPendingBucket(receiver)) {
            _appendBucket(receiver);
        }
        
        //get the pending (last) bucket 
        PaymentBucket storage pendingBucket = _getPendingBucket(receiver);
        
        //check for duplicate
        uint256 bucketIndex = orderIdsToBuckets[orderId].bucketIndex;
        if (bucketIndex > 0) {
            //if the bucket it's in is not pending, ready, or review, then revert 
            if (bucketIndex > 2) {
                //index 1 is review
                //index 2 would be pending 
                //index 3 could be ready, or could be approved
                if (paymentBuckets[receiver][bucketIndex-1].state != STATE_READY) 
                    revert("Order cannot be added to"); //TODO: better revert error
            }
                
            //if duplicate, add to the amount 
            PaymentRecord storage payment = _getPayment(receiver, orderId); 
            payment.amount += amount;
        } else {
            //add the new payment record to the pending bucket
            pendingBucket.payments.push(PaymentRecord(orderId, payer, amount, false));
            
            //add the location of the payment for reference
            BucketLocation memory location; 
            location.receiver = receiver;
            location.bucketIndex = paymentBuckets[receiver].length;
            location.paymentIndex = pendingBucket.payments.length;
            orderIdsToBuckets[orderId] = location;
        }
        
        pendingBucket.total += amount;
    }
    
    function _removePayment(address receiver, uint256 orderId) internal {
        BucketLocation memory location = orderIdsToBuckets[orderId]; 
            
        if (location.paymentIndex > 0 && location.receiver == receiver) {
            PaymentBucket storage bucket = paymentBuckets[receiver][location.bucketIndex-1];
            PaymentRecord storage payment = bucket.payments[location.paymentIndex-1]; 
            
            //revert if bucket is not pending or ready
            if (bucket.state != STATE_PENDING && bucket.state != STATE_FOR_REVIEW) 
                revert("Payment cannot be removed from non-pending, non-review bucket"); //TODO: better revert error
            
            //TODO: (HIGH) revert if order id is wrong 
            
            //create a copy to move to review 
            PaymentRecord memory reviewRecord; 
            reviewRecord.orderId = payment.orderId;
            reviewRecord.amount = payment.amount; 
            reviewRecord.payer = payment.payer; 
            reviewRecord.refunded = payment.refunded;
            
            //move it to the review bucket
            PaymentBucket storage reviewBucket = paymentBuckets[receiver][0];
            reviewBucket.payments.push(reviewRecord); 
            reviewBucket.total += reviewRecord.amount;
            orderIdsToBuckets[orderId].bucketIndex = 0;
            orderIdsToBuckets[orderId].paymentIndex = reviewBucket.payments.length;
            
            //remove it from its current bucket
            payment.orderId = 0;
            bucket.total -= payment.amount; 
            payment.amount = 0;
            payment.payer = address(0);
        }
    }
    
    function _approveReadyBucket(address receiver) internal {
        if (_hasReadyBucket(receiver)) {
            //TODO: might want to limit the number of approved buckets to a small number
            PaymentBucket storage readyBucket = _getReadyBucket(receiver);
            readyBucket.state = STATE_APPROVED;
            
            //push that copy to approved by adding a new bucket on top 
            _appendBucket(receiver);
        }
    }
    
    function _processApprovedBuckets(address receiver) internal {
        PaymentBucket[] storage buckets = paymentBuckets[receiver]; 
        
        //here, loop through approved buckets until the first processed one is found 
        if (buckets.length >= 1) {
            for(uint256 n=buckets.length; n>0; n--) { //avoiding underflow here
                PaymentBucket storage bucket = buckets[n-1];
                
                //TODO: check bucket state & process 
                if (bucket.state == STATE_APPROVED) {
                    bucket.state = STATE_PROCESSED;
                    break;
                }
            }
        }
    }
    
    function _getPayment(address receiver, uint256 orderId) internal view returns (PaymentRecord storage) {
        PaymentBucket storage bucket = _getPendingBucket(receiver);
        BucketLocation memory location = orderIdsToBuckets[orderId];
        uint256 index = location.paymentIndex;
        if (index > 0) {
            index -= 1;
        }
        
        //TODO: if index == 0, it means there's no record; so do something good here
        
        return bucket.payments[index];
    }
    
    function _paymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        BucketLocation memory location = orderIdsToBuckets[orderId];
        return location.receiver == receiver && location.bucketIndex > 0; 
    }
    
    function _pendingPaymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        BucketLocation memory location = orderIdsToBuckets[orderId];
        return location.receiver == receiver && location.bucketIndex > 0 && 
            paymentBuckets[receiver][location.bucketIndex-1].state == STATE_PENDING; 
    }
    
    function _approvedPaymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        BucketLocation memory location = orderIdsToBuckets[orderId];
        return location.receiver == receiver && location.bucketIndex > 0 && 
            paymentBuckets[receiver][location.bucketIndex-1].state == STATE_APPROVED; 
    }
    
    function _hasPendingBucket(address receiver) internal view returns (bool) {
        return paymentBuckets[receiver].length > 1;
    }
    
    function _hasReadyBucket(address receiver) internal view returns (bool) {
        PaymentBucket[] storage buckets = paymentBuckets[receiver];
        return buckets.length > 1 && buckets[buckets.length-2].state == STATE_READY;
    }
    
    function _hasApprovedBucket(address receiver) internal view returns (bool) {
        PaymentBucket[] storage buckets = paymentBuckets[receiver]; 
        for (uint256 n=buckets.length; n>0; n--) {
            
            //at the first approved, return true 
            if (buckets[n-1].state == STATE_APPROVED) 
                return true; 
                
            //break at first processed one; there will be no more approved past this
            if (buckets[n-1].state == STATE_PROCESSED) 
                break;
        }
        
        //if here, none were found 
        return false;
    }
    
    function _getPendingBucket(address receiver) internal view returns (PaymentBucket storage) {
        return paymentBuckets[receiver][paymentBuckets[receiver].length-1];
    }
    
    function _getReadyBucket(address receiver) internal view returns (PaymentBucket storage) {
        return paymentBuckets[receiver][paymentBuckets[receiver].length-2];
    }
    
    function _appendBucket(address receiver) internal returns (bool) {
        PaymentBucket[] storage buckets = paymentBuckets[receiver]; 
        
        //if no buckets yet, first one is review, second is pending 
        if (buckets.length == 0) {
            buckets.push();
            buckets.push();
            buckets[0].state = STATE_FOR_REVIEW;
            buckets[1].state = STATE_PENDING;
            return true;
        }
        
        //not allowed to have two ready or two pending buckets at once
        if (buckets.length > 2 && buckets[buckets.length-3].state <= STATE_READY)
            return false;
            
        //pending bucket becomes ready bucket; new bucket is pending
        buckets[buckets.length-1].state = STATE_READY;
        buckets.push();
        buckets[buckets.length-1].state = STATE_PENDING;
        
        return true;
    }
}