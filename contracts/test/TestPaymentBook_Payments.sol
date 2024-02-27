// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./TestPaymentBook.sol";
import "hardhat/console.sol";

contract TestPaymentBook_Payments is TestPaymentBook
{
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
        _addTestPaymentsToPending(receiver, payer);
        
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
        _addTestPaymentsToBucket(receiver, payer, 2);
        
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
        _addTestPaymentsToBucket(receiver, payer, 1);
        
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
        _addTestPaymentsToBucket(receiver, payer, 2);
        
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
        _addTestPaymentsToBucket(receiver, payer, 2);
        
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
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //add the pending & ready buckets
        _appendBucket(receiver);
        _appendBucket(receiver);
        
        //add payments to ready bucket 
        _addTestPaymentsToBucket(receiver, payer, 2);
        
        //approve ready bucket 
        paymentBuckets[receiver][1].state = STATE_APPROVED;
        
        //this should not fail 
        _addPaymentToBucket(2, receiver, 1, payer, 1000);
        
        //but this should fail
        _addPayment(receiver, 1, payer, 5000); 
    }
    
    function test_addPayments_cannot_add_to_existing_in_processed(address payer) external {
        address receiver = msg.sender;
        
        //at start, bucket count is zero 
        _assert(paymentBuckets[receiver].length == 0, "Buckets not empty");
        
        //add the pending & ready buckets
        _appendBucket(receiver);
        _appendBucket(receiver);
        
        //add payments to ready bucket 
        _addTestPaymentsToBucket(receiver, payer, 2);
        
        //approve & process ready bucket 
        paymentBuckets[receiver][1].state = STATE_PROCESSED;
        
        //this should not fail 
        _addPaymentToBucket(2, receiver, 1, payer, 1000);
        
        //but this should fail
        _addPayment(receiver, 1, payer, 5000); 
    }
}