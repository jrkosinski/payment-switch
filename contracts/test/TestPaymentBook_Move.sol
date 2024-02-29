// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./TestPaymentBook.sol";
import "hardhat/console.sol";

contract TestPaymentBook_Move is TestPaymentBook
{
    /**
     * Add and then remove a payment from pending bucket. 
     */
    function test_can_remove_payment_from_pending(address payer) external {
        address receiver = msg.sender;
        
        _assert(paymentBuckets[receiver].length == 0, "Bucket count before test != 0");
        
        //adds review & pending 
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 2, "Bucket count after test != 1");
        
        //add test payments 
        _addTestPaymentsToPending(receiver, payer);
        
        //get the pending bucket 
        PaymentBucket storage pendingBucket = _getBucketWithState(receiver, STATE_PENDING);
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(paymentExists(2) == true, "Payment should exist");
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(pendingBucket.payments[1].id == 2, "Id is wrong");
        _assert(pendingBucket.payments[1].payer == payer, "Payer is wrong");
        _assert(pendingBucket.payments[1].amount == 2000, "Amount is wrong");
        _assert(pendingBucket.total == 6000, "Bucket total is wrong");
        
        //remove payment and location
        _removePayment(2, true); 
        
        //test that location has been erased 
        _assert(paymentExists(2) == false, "Payment should be gone from location");
        
        //payment data should be zeroed out, but array length should be the same 
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(pendingBucket.payments[1].id == 0, "Id should be zeroed");
        _assert(pendingBucket.payments[1].payer == address(0), "Payer should be zeroed");
        _assert(pendingBucket.payments[1].amount == 0, "Amount should be zeroed");
        _assert(pendingBucket.total == 4000, "Bucket total is wrong");
    }
    
    /**
     * Add a payment, move it to review, then remove it. 
     */
    function test_can_remove_payment_from_review(address payer) external {
        address receiver = msg.sender;
        
        _assert(paymentBuckets[receiver].length == 0, "Bucket count before test != 0");
        
        //adds review & pending 
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 2, "Bucket count after test != 1");
        
        //add test payments 
        _addTestPaymentsToPending(receiver, payer);
        
        //get the pending bucket 
        PaymentBucket storage pendingBucket = _getBucketWithState(receiver, STATE_PENDING);
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(paymentExists(2) == true, "Payment should exist");
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(pendingBucket.payments[1].id == 2, "Id is wrong");
        _assert(pendingBucket.payments[1].payer == payer, "Payer is wrong");
        _assert(pendingBucket.payments[1].amount == 2000, "Amount is wrong");
        _assert(pendingBucket.total == 6000, "Bucket total is wrong");
        
        //move payment to review
        _movePayment(2, 1); 
        PaymentBucket storage reviewBucket = _getBucketWithState(receiver, STATE_REVIEW);
        
        //make sure that payment is now in review 
        _assert(paymentAddresses[2].bucketIndex == 1, "Payment should be in review bucket");
        _assert(reviewBucket.payments.length == 1, "Payment count is wrong"); 
        _assert(reviewBucket.payments[0].id == 2, "Id is wrong");
        _assert(reviewBucket.payments[0].payer == payer, "Payer is wrong");
        _assert(reviewBucket.payments[0].amount == 2000, "Amount is wrong");
        _assert(reviewBucket.total == 2000, "Bucket total is wrong");
    }
    
    /**
     * Add a payment to pending bucket, then move it to review. 
     */
    function test_can_move_from_pending_to_review(address payer) external {
        address receiver = msg.sender;
        
        _assert(paymentBuckets[receiver].length == 0, "Bucket count before test != 0");
        
        //adds review & pending 
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 2, "Bucket count after test != 1");
        
        //add test payments 
        _addTestPaymentsToPending(receiver, payer);
        
        //get the pending bucket 
        PaymentBucket storage pendingBucket = _getBucketWithState(receiver, STATE_PENDING);
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(paymentExists(2) == true, "Payment should exist");
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(pendingBucket.payments[1].id == 2, "Id is wrong");
        _assert(pendingBucket.payments[1].payer == payer, "Payer is wrong");
        _assert(pendingBucket.payments[1].amount == 2000, "Amount is wrong");
        _assert(pendingBucket.total == 6000, "Bucket total is wrong");
        
        //move payment to review
        _movePayment(2, 1); 
        PaymentBucket storage reviewBucket = _getBucketWithState(receiver, STATE_REVIEW);
        
        //bucket totals
        _assert(pendingBucket.total == 4000, "Pending bucket total is wrong");
        _assert(reviewBucket.total == 2000, "Review bucket total is wrong");
        
        //payment locations 
        _assert(paymentAddresses[1].bucketIndex == 2, "Payment 1 should be in pending");
        _assert(paymentAddresses[2].bucketIndex == 1, "Payment 2 should be in review");
        _assert(paymentAddresses[3].bucketIndex == 2, "Payment 3 should be in pending");
        
        //payment values 
        _assert(paymentAddresses[2].paymentIndex == 1, "Payment 2 should be first in bucket");
        _assert(reviewBucket.payments[0].amount == 2000, "Payment 2 amount is wrong");
        _assert(pendingBucket.payments[1].amount == 0, "Payment 2 amount should be zeroed");
    }
    
    /**
     * Add a payment to pending bucket, then move it to review, then back to pending.
     */
    function test_can_move_from_review_to_pending(address payer) external {
        address receiver = msg.sender;
        
        _assert(paymentBuckets[receiver].length == 0, "Bucket count before test != 0");
        
        //adds review & pending 
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 2, "Bucket count after test != 1");
        
        //add test payments 
        _addTestPaymentsToPending(receiver, payer);
        
        //get the pending bucket 
        PaymentBucket storage pendingBucket = _getBucketWithState(receiver, STATE_PENDING);
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(paymentExists(2) == true, "Payment should exist");
        _assert(pendingBucket.payments.length == 3, "Payment count is wrong"); 
        _assert(pendingBucket.payments[1].id == 2, "Id is wrong");
        _assert(pendingBucket.payments[1].payer == payer, "Payer is wrong");
        _assert(pendingBucket.payments[1].amount == 2000, "Amount is wrong");
        _assert(pendingBucket.total == 6000, "Bucket total is wrong");
        
        //move payment to review
        _movePayment(2, 1); 
        _movePayment(2, 2); 
        PaymentBucket storage reviewBucket = _getBucketWithState(receiver, STATE_REVIEW);
        
        //bucket totals
        _assert(pendingBucket.total == 6000, "Pending bucket total is wrong");
        _assert(reviewBucket.total == 0, "Review bucket total is wrong");
        
        //payment locations 
        _assert(paymentAddresses[1].bucketIndex == 2, "Payment 1 should be in pending");
        _assert(paymentAddresses[2].bucketIndex == 2, "Payment 2 should be in pending");
        _assert(paymentAddresses[3].bucketIndex == 2, "Payment 3 should be in pending");
        
        //payment values 
        _assert(paymentAddresses[2].paymentIndex == pendingBucket.payments.length, "Payment 2 should be last in bucket");
        _assert(pendingBucket.payments[pendingBucket.payments.length-1].amount == 2000, "Payment 2 amount is wrong");
        _assert(reviewBucket.payments[0].amount == 0, "Payment 2 amount should be zeroed");
    }
}