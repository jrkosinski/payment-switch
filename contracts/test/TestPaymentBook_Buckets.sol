// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./TestPaymentBook.sol";
import "hardhat/console.sol";

contract TestPaymentBook_Buckets is TestPaymentBook
{
    /**
     * [] => [RV][P]
     */
    function test_stateTransitions0() external {
        address receiver = msg.sender;
        
        _assert(paymentBuckets[receiver].length == 0, "Bucket count before test != 0");
        
        //adds review & pending 
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 2, "Bucket count after test != 1");
        
        //review bucket
        _assert(paymentBuckets[receiver][0].state == STATE_FOR_REVIEW, "New bucket state != STATE_FOR_REVIEW");
        _assert(paymentBuckets[receiver][0].total == 0, "Review bucket total != 0");
        _assert(paymentBuckets[receiver][0].payments.length == 0, "Review bucket payments.length != 0");
        
        //pending bucket
        _assert(paymentBuckets[receiver][1].state == STATE_PENDING, "New bucket state != STATE_PENDING");
        _assert(paymentBuckets[receiver][1].total == 0, "Pending bucket total != 0");
        _assert(paymentBuckets[receiver][1].payments.length == 0, "Pending bucket payments.length != 0");
        
        _assert(_getBucketIndexWithState(receiver, STATE_APPROVED) == 0, "getBucketIndexWithState(receiver, STATE_APPROVED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_READY) == 0, "getBucketIndexWithState(receiver, STATE_READY) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(_getBucketIndexWithState(receiver, STATE_PENDING) == 2, "getBucketIndexWithState(receiver, STATE_PENDING) != 2");
        
        _assert(paymentBuckets[receiver].length == 2, "Bucket length should be 2");
    }
    
    /**
     * [RV][P] => [RV][R][P]
     */
    function test_stateTransitions1() external {
        address receiver = msg.sender;
        
        //adds review & pending 
        _appendBucket(receiver);
        
        //ready bucket
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 3, "Bucket before test != 3");
        
        _assert(_getBucketIndexWithState(receiver, STATE_APPROVED) == 0, "getBucketIndexWithState(receiver, STATE_APPROVED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(_getBucketIndexWithState(receiver, STATE_READY) == 2, "getBucketIndexWithState(receiver, STATE_READY) != 2");
        _assert(_getBucketIndexWithState(receiver, STATE_PENDING) == 3, "getBucketIndexWithState(receiver, STATE_PENDING) != 3");
        
        _assert(paymentBuckets[receiver].length == 3, "Bucket length should be 3");
    }
    
    /**
     * [RV][R][P] => [RV][A][R][P]
     */
    function test_stateTransitions2() external {
        address receiver = msg.sender;
        
        //adds review & pending 
        _appendBucket(receiver);
        
        //ready bucket
        _appendBucket(receiver);
        _assert(paymentBuckets[receiver].length == 3, "Bucket count after test != 3");
        
        _assert(_getBucketIndexWithState(receiver, STATE_APPROVED) == 0, "getBucketIndexWithState(receiver, STATE_APPROVED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(_getBucketIndexWithState(receiver, STATE_READY) == 2, "getBucketIndexWithState(receiver, STATE_READY) != 2");
        _assert(_getBucketIndexWithState(receiver, STATE_PENDING) == 3, "getBucketIndexWithState(receiver, STATE_PENDING) != 3");
        
        //set ready bucket to approved
        paymentBuckets[receiver][1].state = STATE_APPROVED;
        
        _assert(_getBucketIndexWithState(receiver, STATE_APPROVED) == 2, "getBucketIndexWithState(receiver, STATE_APPROVED) != 2");
        _assert(_getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(_getBucketIndexWithState(receiver, STATE_READY) == 0, "getBucketIndexWithState(receiver, STATE_READY) != 2");
        _assert(_getBucketIndexWithState(receiver, STATE_PENDING) == 3, "getBucketIndexWithState(receiver, STATE_PENDING) != 3");
        
        //append new bucket 
        _appendBucket(receiver);
        
        _assert(_getBucketIndexWithState(receiver, STATE_APPROVED) == 2, "getBucketIndexWithState(receiver, STATE_APPROVED) != 2");
        _assert(_getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(_getBucketIndexWithState(receiver, STATE_READY) == 3, "getBucketIndexWithState(receiver, STATE_READY) != 3");
        _assert(_getBucketIndexWithState(receiver, STATE_PENDING) == 4, "getBucketIndexWithState(receiver, STATE_PENDING) != 4");
        
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
        _appendBucket(receiver);
        
        //ready bucket
        _appendBucket(receiver);
        
        //set ready bucket to approved 
        paymentBuckets[receiver][1].state = STATE_APPROVED;
        
        //append new bucket 
        _appendBucket(receiver);
        
        //set ready bucket to approved 
        paymentBuckets[receiver][2].state = STATE_APPROVED;
        
        //append new bucket 
        _appendBucket(receiver);
        
        _assert(_getBucketIndexWithState(receiver, STATE_APPROVED) == 3, "getBucketIndexWithState(receiver, STATE_APPROVED) != 2");
        _assert(_getBucketIndexWithState(receiver, STATE_PROCESSED) == 0, "getBucketIndexWithState(receiver, STATE_PROCESSED) != 0");
        _assert(_getBucketIndexWithState(receiver, STATE_FOR_REVIEW) == 1, "getBucketIndexWithState(receiver, STATE_FOR_REVIEW) != 1");
        _assert(_getBucketIndexWithState(receiver, STATE_READY) == 4, "getBucketIndexWithState(receiver, STATE_READY) != 3");
        _assert(_getBucketIndexWithState(receiver, STATE_PENDING) == 5, "getBucketIndexWithState(receiver, STATE_PENDING) != 4");
        
        _assert(paymentBuckets[receiver][0].state == STATE_FOR_REVIEW, "Bucket 0 state should be STATE_FOR_REVIEW");
        _assert(paymentBuckets[receiver][1].state == STATE_APPROVED, "Bucket 1 state should be STATE_APPROVED");
        _assert(paymentBuckets[receiver][2].state == STATE_APPROVED, "Bucket 2 state should be STATE_APPROVED");
        _assert(paymentBuckets[receiver][3].state == STATE_READY, "Bucket 3 state should be STATE_READY");
        _assert(paymentBuckets[receiver][4].state == STATE_PENDING, "Bucket 4 state should be STATE_PENDING");
        
        _assert(paymentBuckets[receiver].length == 5, "Bucket length should be 5");
    }
    
    /**
     * Will revert, because we're trying to add a new bucket to [RV][A][R][P]
     */
    function test_stateTransitions_wont_add_multple_pending() external {
        address receiver = msg.sender;
        
        _appendBucket(receiver);
        _appendBucket(receiver);
        _appendBucket(receiver);
        _appendBucket(receiver);
    }
}