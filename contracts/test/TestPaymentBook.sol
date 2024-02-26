// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "../PaymentBook.sol";
import "hardhat/console.sol";

contract TestPaymentBook is PaymentBook
{
    function _assert(bool condition, string memory message) public pure {
        if (!condition) revert(message);
    }
    
    /**
     * [] => [RV][P]
     */
    function test_stateTransitions0() external {
        address receiver = msg.sender;
        
        _assert(paymentBuckets[receiver].length == 0, "Bucket count before test != 0");
        
        //adds review & pending 
        appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 2, "Bucket count after test != 1");
        
        //review bucket
        _assert(paymentBuckets[receiver][0].state == STATE_FOR_REVIEW, "New bucket state != STATE_FOR_REVIEW");
        _assert(paymentBuckets[receiver][0].total == 0, "Review bucket total != 0");
        _assert(paymentBuckets[receiver][0].payments.length == 0, "Review bucket payments.length != 0");
        
        //pending bucket
        _assert(paymentBuckets[receiver][1].state == STATE_PENDING, "New bucket state != STATE_PENDING");
        _assert(paymentBuckets[receiver][1].total == 0, "Pending bucket total != 0");
        _assert(paymentBuckets[receiver][1].payments.length == 0, "Pending bucket payments.length != 0");
        
        _assert(getBucketIndexWithState(receiver, STATE_APPROVED) == 0, "getBucketIndexWithState(receiver, STATE_APPROVED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_READY) == 0, "getBucketIndexWithState(receiver, STATE_READY) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(getBucketIndexWithState(receiver, STATE_PENDING) == 2, "getBucketIndexWithState(receiver, STATE_PENDING) != 2");
        
        _assert(paymentBuckets[receiver].length == 2, "Bucket length should be 2");
    }
    
    /**
     * [RV][P] => [RV][R][P]
     */
    function test_stateTransitions1() external {
        address receiver = msg.sender;
        
        //adds review & pending 
        appendBucket(receiver);
        
        //ready bucket
        appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 3, "Bucket before test != 3");
        
        _assert(getBucketIndexWithState(receiver, STATE_APPROVED) == 0, "getBucketIndexWithState(receiver, STATE_APPROVED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(getBucketIndexWithState(receiver, STATE_READY) == 2, "getBucketIndexWithState(receiver, STATE_READY) != 2");
        _assert(getBucketIndexWithState(receiver, STATE_PENDING) == 3, "getBucketIndexWithState(receiver, STATE_PENDING) != 3");
        
        _assert(paymentBuckets[receiver].length == 3, "Bucket length should be 3");
    }
    
    /**
     * [RV][R][P] => [RV][A][R][P]
     */
    function test_stateTransitions2() external {
        address receiver = msg.sender;
        
        //adds review & pending 
        appendBucket(receiver);
        
        //ready bucket
        appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 3, "Bucket count after test != 3");
        
        _assert(getBucketIndexWithState(receiver, STATE_APPROVED) == 0, "getBucketIndexWithState(receiver, STATE_APPROVED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(getBucketIndexWithState(receiver, STATE_READY) == 2, "getBucketIndexWithState(receiver, STATE_READY) != 2");
        _assert(getBucketIndexWithState(receiver, STATE_PENDING) == 3, "getBucketIndexWithState(receiver, STATE_PENDING) != 3");
        
        //set ready bucket to approved 
        paymentBuckets[receiver][1].state = STATE_APPROVED;
        
        _assert(getBucketIndexWithState(receiver, STATE_APPROVED) == 2, "getBucketIndexWithState(receiver, STATE_APPROVED) != 2");
        _assert(getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(getBucketIndexWithState(receiver, STATE_READY) == 0, "getBucketIndexWithState(receiver, STATE_READY) != 2");
        _assert(getBucketIndexWithState(receiver, STATE_PENDING) == 3, "getBucketIndexWithState(receiver, STATE_PENDING) != 3");
        
        //append new bucket 
        appendBucket(receiver);
        
        _assert(getBucketIndexWithState(receiver, STATE_APPROVED) == 2, "getBucketIndexWithState(receiver, STATE_APPROVED) != 2");
        _assert(getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(getBucketIndexWithState(receiver, STATE_READY) == 3, "getBucketIndexWithState(receiver, STATE_READY) != 3");
        _assert(getBucketIndexWithState(receiver, STATE_PENDING) == 4, "getBucketIndexWithState(receiver, STATE_PENDING) != 4");
        
        _assert(paymentBuckets[receiver][0].state == STATE_FOR_REVIEW, "Bucket 0 state should be STATE_FOR_REVIEW");
        _assert(paymentBuckets[receiver][1].state == STATE_APPROVED, "Bucket 1 state should be STATE_APPROVED");
        _assert(paymentBuckets[receiver][2].state == STATE_READY, "Bucket 2 state should be STATE_READY");
        _assert(paymentBuckets[receiver][3].state == STATE_PENDING, "Bucket 3 state should be STATE_PENDING");
        
        _assert(paymentBuckets[receiver].length == 4, "Bucket length should be 4");
    }
    
    /**
     * [RV][R][P] => [RV][A][R][P] => [RV][A][A][R][P]
     */
    function test_stateTransitions3() external {
        address receiver = msg.sender;
        
        //adds review & pending 
        appendBucket(receiver);
        
        //ready bucket
        appendBucket(receiver);
        
        //set ready bucket to approved 
        paymentBuckets[receiver][1].state = STATE_APPROVED;
        
        //append new bucket 
        appendBucket(receiver);
        
        //set ready bucket to approved 
        paymentBuckets[receiver][2].state = STATE_APPROVED;
        
        //append new bucket 
        appendBucket(receiver);
        
        _assert(getBucketIndexWithState(receiver, STATE_APPROVED) == 3, "getBucketIndexWithState(receiver, STATE_APPROVED) != 2");
        _assert(getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(getBucketIndexWithState(receiver, STATE_READY) == 4, "getBucketIndexWithState(receiver, STATE_READY) != 3");
        _assert(getBucketIndexWithState(receiver, STATE_PENDING) == 5, "getBucketIndexWithState(receiver, STATE_PENDING) != 4");
        
        _assert(paymentBuckets[receiver][0].state == STATE_FOR_REVIEW, "Bucket 0 state should be STATE_FOR_REVIEW");
        _assert(paymentBuckets[receiver][1].state == STATE_APPROVED, "Bucket 1 state should be STATE_APPROVED");
        _assert(paymentBuckets[receiver][2].state == STATE_APPROVED, "Bucket 2 state should be STATE_APPROVED");
        _assert(paymentBuckets[receiver][3].state == STATE_READY, "Bucket 3 state should be STATE_READY");
        _assert(paymentBuckets[receiver][4].state == STATE_PENDING, "Bucket 4 state should be STATE_PENDING");
        
        _assert(paymentBuckets[receiver].length == 5, "Bucket length should be 5");
    }
    
    function test_stateTransitions_wont_add_multple_pending() external {
        address receiver = msg.sender;
        
        appendBucket(receiver);
        appendBucket(receiver);
        appendBucket(receiver);
        appendBucket(receiver);
    }
    
    function test_addPayments_zero_buckets(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //add a payment 
        _addPayment(receiver, 1, payer, 1000); 
        
        //bucket count should now be 2: [RV][P]
        PaymentBucket[] memory buckets = paymentBuckets[receiver];
        _assert(buckets.length == 2, "Bucket length should be 2");
        _assert(buckets[0].state == STATE_FOR_REVIEW, "First bucket should be FOR_REVIEW");
        _assert(buckets[1].state == STATE_PENDING, "Should be PENDING bucket");
        _assert(buckets[0].payments.length == 0, "FOR_REVIEW Bucket should have no payment");
        _assert(buckets[1].payments.length == 1, "PENDING Bucket should have one payment");
        
        _assert(buckets[1].payments[0].amount == 1000, "Amount is wrong");
        _assert(buckets[1].payments[0].payer == payer, "Payer is wrong");
        _assert(buckets[1].payments[0].id == 1, "ID is wrong");
        
        //get the payment by id 
        PaymentAddress memory location = paymentAddresses[1];
        _assert(location.bucketIndex == 2, "Payment address bucketIndex is wrong");
        _assert(location.paymentIndex == 1, "Payment address paymentIndex is wrong");
        _assert(location.receiver == receiver, "Payment address receiver is wrong");
    }
    
    function test_addPayments_pending_bucket(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //add a few payments 
        _addPayment(receiver, 1, payer, 1000); 
        _addPayment(receiver, 2, payer, 2000); 
        _addPayment(receiver, 3, payer, 3000); 
        
        //bucket count should now be 2: [RV][P]
        PaymentBucket[] memory buckets = paymentBuckets[receiver];
        _assert(buckets.length == 2, "Bucket length should be 2");
        _assert(buckets[0].state == STATE_FOR_REVIEW, "First bucket should be FOR_REVIEW");
        _assert(buckets[1].state == STATE_PENDING, "Should be PENDING bucket");
        _assert(buckets[0].payments.length == 0, "FOR_REVIEW Bucket should have no payment");
        _assert(buckets[1].payments.length == 3, "PENDING Bucket should have three payments");
        _assert(buckets[0].total == 0, "FOR_REVIEW Bucket should have total of zero");
        _assert(buckets[1].total == 6000, "PENDING Bucket total is wrong");
        
        //payment 0
        _assert(buckets[1].payments[0].amount == 1000, "Amount 1 is wrong");
        _assert(buckets[1].payments[0].payer == payer, "Payer 1 is wrong");
        _assert(buckets[1].payments[0].id == 1, "ID 1 is wrong");
        
        //payment 1
        _assert(buckets[1].payments[1].amount == 2000, "Amount 2 is wrong");
        _assert(buckets[1].payments[1].payer == payer, "Payer 2 is wrong");
        _assert(buckets[1].payments[1].id == 2, "ID 2 is wrong");
        
        //payment 2
        _assert(buckets[1].payments[2].amount == 3000, "Amount 3 is wrong");
        _assert(buckets[1].payments[2].payer == payer, "Payer 3 is wrong");
        _assert(buckets[1].payments[2].id == 3, "ID 3 is wrong");
        
        //get payment 1 by id 
        PaymentAddress memory location1 = paymentAddresses[1];
        _assert(location1.bucketIndex == 2, "Payment 1 address bucketIndex is wrong");
        _assert(location1.paymentIndex == 1, "Payment 1 address paymentIndex is wrong");
        _assert(location1.receiver == receiver, "Payment 1 address receiver is wrong");
        
        //get payment 2 by id 
        PaymentAddress memory location2 = paymentAddresses[2];
        _assert(location2.bucketIndex == 2, "Payment 2 address bucketIndex is wrong");
        _assert(location2.paymentIndex == 2, "Payment 2 address paymentIndex is wrong");
        _assert(location2.receiver == receiver, "Payment 2 address receiver is wrong");
        
        //get payment 3 by id 
        PaymentAddress memory location3 = paymentAddresses[3];
        _assert(location3.bucketIndex == 2, "Payment 3 address bucketIndex is wrong");
        _assert(location3.paymentIndex == 3, "Payment 3 address paymentIndex is wrong");
        _assert(location3.receiver == receiver, "Payment 3 address receiver is wrong");
    }
    
    function test_addPayments_can_add_to_ready(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //freeze the pending bucket 
        _appendBucket(receiver);
        _appendBucket(receiver);
        
        PaymentBucket[] storage buckets = paymentBuckets[receiver];
        _assert(buckets.length == 3, "Bucket length should be 3");
        
        //attempt to add payments to ready bucket
        _addPaymentToBucket(receiver, 2, 1, payer, 1000);
        _addPaymentToBucket(receiver, 2, 2, payer, 2000);
        _addPaymentToBucket(receiver, 2, 3, payer, 3000);
        
        _assert(buckets[0].payments.length == 0, "FOR_REVIEW Bucket should have no payment");
        _assert(buckets[1].payments.length == 3, "READY Bucket should have three payments");
        _assert(buckets[2].payments.length == 0, "PENDING Bucket should have 0 payments");
        _assert(buckets[0].total == 0, "FOR_REVIEW Bucket should have total of zero");
        _assert(buckets[1].total == 6000, "READY Bucket total is wrong");
        _assert(buckets[2].total == 0, "PENDING Bucket should have total of zero");
        
        //get payment 1 by id 
        PaymentAddress memory location1 = paymentAddresses[1];
        _assert(location1.bucketIndex == 2, "Payment 1 address bucketIndex is wrong");
        _assert(location1.paymentIndex == 1, "Payment 1 address paymentIndex is wrong");
        _assert(location1.receiver == receiver, "Payment 1 address receiver is wrong");
        
        //get payment 2 by id 
        PaymentAddress memory location2 = paymentAddresses[2];
        _assert(location2.bucketIndex == 2, "Payment 2 address bucketIndex is wrong");
        _assert(location2.paymentIndex == 2, "Payment 2 address paymentIndex is wrong");
        _assert(location2.receiver == receiver, "Payment 2 address receiver is wrong");
        
        //get payment 3 by id 
        PaymentAddress memory location3 = paymentAddresses[3];
        _assert(location3.bucketIndex == 2, "Payment 3 address bucketIndex is wrong");
        _assert(location3.paymentIndex == 3, "Payment 3 address paymentIndex is wrong");
        _assert(location3.receiver == receiver, "Payment 3 address receiver is wrong");
    }
    
    function test_addPayments_can_add_to_review(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //freeze the pending bucket 
        _appendBucket(receiver);
        _appendBucket(receiver);
        
        PaymentBucket[] storage buckets = paymentBuckets[receiver];
        _assert(buckets.length == 3, "Bucket length should be 3");
        
        //attempt to add payments to review bucket
        _addPaymentToBucket(receiver, 1, 1, payer, 1000);
        _addPaymentToBucket(receiver, 1, 2, payer, 2000);
        _addPaymentToBucket(receiver, 1, 3, payer, 3000);
        
        _assert(buckets[0].payments.length == 3, "FOR_REVIEW Bucket should have 3 payments");
        _assert(buckets[1].payments.length == 0, "READY Bucket should have 0 payments");
        _assert(buckets[2].payments.length == 0, "PENDING Bucket should have 0 payments");
        _assert(buckets[0].total == 6000, "FOR_REVIEW Bucket total is wrong");
        _assert(buckets[1].total == 0, "READY Bucket should have total of zero");
        _assert(buckets[2].total == 0, "PENDING Bucket should have total of zero");
        
        //get payment 1 by id 
        PaymentAddress memory location1 = paymentAddresses[1];
        _assert(location1.bucketIndex == 1, "Payment 1 address bucketIndex is wrong");
        _assert(location1.paymentIndex == 1, "Payment 1 address paymentIndex is wrong");
        _assert(location1.receiver == receiver, "Payment 1 address receiver is wrong");
        
        //get payment 2 by id 
        PaymentAddress memory location2 = paymentAddresses[2];
        _assert(location2.bucketIndex == 1, "Payment 2 address bucketIndex is wrong");
        _assert(location2.paymentIndex == 2, "Payment 2 address paymentIndex is wrong");
        _assert(location2.receiver == receiver, "Payment 2 address receiver is wrong");
        
        //get payment 3 by id 
        PaymentAddress memory location3 = paymentAddresses[3];
        _assert(location3.bucketIndex == 1, "Payment 3 address bucketIndex is wrong");
        _assert(location3.paymentIndex == 3, "Payment 3 address paymentIndex is wrong");
        _assert(location3.receiver == receiver, "Payment 3 address receiver is wrong");
    }
    
    function test_addPayments_can_add_to_existing_in_pending(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //add the pending bucket 
        _appendBucket(receiver);
        
        PaymentBucket[] storage buckets = paymentBuckets[receiver];
        
        //add payments to pending bucket
        _addPaymentToBucket(receiver, 2, 1, payer, 1000);
        _addPaymentToBucket(receiver, 2, 2, payer, 2000);
        _addPaymentToBucket(receiver, 2, 3, payer, 3000);
        
        _assert(buckets[1].state == STATE_PENDING, "Bucket state is wrong");
        _assert(buckets[1].total == 6000, "PENDING Bucket total is wrong");
        _assert(buckets[1].payments[1].amount == 2000, "Payment amount is wrong");
        
        //add to the existing payment 2
        _addPayment(receiver, 2, payer, 5000); 
        _assert(buckets[1].payments[1].amount == 7000, "Payment amount is wrong");
        _addPayment(receiver, 2, payer, 2000); 
        _assert(buckets[1].payments[1].amount == 9000, "Payment amount is wrong");
        _assert(buckets[1].total == 13000, "PENDING Bucket total is wrong");
        
        //add to the existing payment 3
        _addPayment(receiver, 3, payer, 5000); 
        _assert(buckets[1].payments[2].amount == 8000, "Payment amount is wrong");
        _assert(buckets[1].total == 18000, "PENDING Bucket total is wrong");
    }
    
    function test_addPayments_can_add_to_existing_in_ready(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //add the pending bucket 
        _appendBucket(receiver);
        
        PaymentBucket[] storage buckets = paymentBuckets[receiver];
        
        //add payments to pending bucket
        _addPaymentToBucket(receiver, 2, 1, payer, 1000);
        _addPaymentToBucket(receiver, 2, 2, payer, 2000);
        _addPaymentToBucket(receiver, 2, 3, payer, 3000);
        
        //move payments to ready bucket 
        _appendBucket(receiver); 
        
        _assert(buckets[1].state == STATE_READY, "Bucket state is wrong");
        _assert(buckets[1].total == 6000, "READY Bucket total is wrong");
        _assert(buckets[1].payments[1].amount == 2000, "Payment amount is wrong");
        
        //add to the existing payment 2
        _addPayment(receiver, 2, payer, 5000); 
        _assert(buckets[1].payments[1].amount == 7000, "Payment amount is wrong");
        _addPayment(receiver, 2, payer, 2000); 
        _assert(buckets[1].payments[1].amount == 9000, "Payment amount is wrong");
        _assert(buckets[1].total == 13000, "READY Bucket total is wrong");
        
        //add to the existing payment 3
        _addPayment(receiver, 3, payer, 5000); 
        _assert(buckets[1].payments[2].amount == 8000, "Payment amount is wrong");
        _assert(buckets[1].total == 18000, "READY Bucket total is wrong");
    }
    
    function test_addPayments_cannot_add_to_existing_in_approved(address payer) external {
        
    }
    
    function test_addPayments_cannot_add_to_existing_in_processed(address payer) external {
        
    }
    
    
    
    //test 1 addBuckets
    function getBucketWithState(address receiver, uint8 state) public view returns (PaymentBucket memory) {
        return _getBucketWithState(receiver, state);
    }
    
    //test 1 addBuckets
    function getBucketIndexWithState(address receiver, uint8 state) public view returns (uint256) {
        return _getBucketIndexWithState(receiver, state);
    }
    
    function paymentExists(uint256 id) public view returns (bool) {
        return _paymentExists(id);
    }
    
    function getTotalInState(address receiver, uint8 state) public view returns (uint256) {
        return _getTotalInState(receiver, state);
    }
    
    //test 1 addBuckets
    function appendBucket(address receiver) public {
        _appendBucket(receiver);
    }
    
    function addPendingPayment(address receiver, uint256 id, address payer, uint256 amount) public {
        _addPayment(receiver, id, payer, amount);
    }
    
    function removePayment(uint256 id, bool removeLocation) public {
        _removePayment(id, removeLocation);
    }
    
    function movePayment(uint256 id, uint256 destBucketIndex) public {
        _movePayment(id, destBucketIndex);
    }
    
    function addPaymentToBucket(
        uint256 bucketIndex, 
        address receiver, 
        uint256 id, 
        address payer, 
        uint256 amount
    ) public {
        _addPaymentToBucket(receiver, bucketIndex, id, payer, amount);
    }
    
    function setBucketState(address receiver, uint256 bucketIndex, uint8 newState) public {
        paymentBuckets[receiver][bucketIndex-1].state = newState;
    }
    
    function getBucketCount(address receiver) public view returns (uint256) {
        return paymentBuckets[receiver].length;
    }
}