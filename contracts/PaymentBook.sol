// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "hardhat/console.sol";

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
    mapping(address => PaymentBucket) internal pendingBuckets; 
    mapping(address => PaymentBucket[]) internal approvedBuckets; 
    mapping(address => mapping(uint256 => uint256)) internal orderIdsToIndexes;  //TODO: this needs epochs or it will cause problems
    mapping(address => uint256) internal approvedFunds;
    
    //enum 
    uint8 constant STATE_PENDING = 1;
    uint8 constant STATE_APPROVED = 2;
    uint8 constant STATE_PROCESSED = 3;
    
    //errors
    error DuplicateEntry();
    
    struct PaymentBucket 
    {
        uint256 total;
        PaymentList paymentList;
    }
    
    struct PaymentRecord 
    {
        uint256 orderId;
        address payer;
        uint256 amount;
        bool refunded;
    }
    
    struct PaymentList 
    {
        uint8 status;
        PaymentRecord[] payments;
    }
    
    
    function getPendingPayments(address receiver) public view returns (PaymentBucket memory) {
        return pendingBuckets[receiver];
    }
    
    function getApprovedPayments(address receiver) public view returns (PaymentBucket[] memory) {
        return approvedBuckets[receiver];
    }
    
    function getAmountOwed(address receiver) public view returns (uint256) {
        return approvedFunds[receiver]; 
    }
    
    function getAmountPending(address receiver) public view returns (uint256) {
        return pendingBuckets[receiver].total; 
    }
    
    
    function _addPendingPayment(address receiver, uint256 orderId, address payer, uint256 amount) internal {
        PaymentBucket storage pending = pendingBuckets[receiver];
        pendingBuckets[receiver].paymentList.status = STATE_PENDING;
        
        //check for duplicate
        if (orderIdsToIndexes[receiver][orderId] > 0) {
            //if duplicate, add to the amount 
            PaymentRecord storage payment = _getPendingPayment(receiver, orderId); 
            payment.amount += amount;
        } else {
            //add the new payment record to the pending bucket
            pending.paymentList.payments.push(PaymentRecord(orderId, payer, amount, false));
            orderIdsToIndexes[receiver][orderId] = pending.paymentList.payments.length;
        }
        
        pending.total += amount;
    }
    
    function _removePendingPayment(address receiver, uint256 orderId) internal {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        if (index > 0) {
            PaymentRecord storage payment = pendingBuckets[receiver].paymentList.payments[index-1];  
            payment.orderId = 0;
            pendingBuckets[receiver].total -= payment.amount; 
            payment.amount = 0;
        }
    }
    
    function _approvePendingBucket(address receiver) internal {
        //make a copy of the pending bucket
        PaymentBucket storage pending = pendingBuckets[receiver];
        
        //TODO: don't allow approval unless all approved buckets are processed
        
        //push that copy to approved 
        pending.paymentList.status = STATE_APPROVED;
        approvedBuckets[receiver].push(pending);
        
        //record the amount 
        approvedFunds[receiver] += pending.total;
        
        //delete the payments from the actual pending bucket (they've been moved)
        pending.total = 0; 
        pending.paymentList.status = STATE_PENDING;
        delete pending.paymentList.payments;
    }
    
    function _processApprovedBucket(address receiver) internal {
        PaymentBucket[] storage approved = approvedBuckets[receiver];
        
        //if there are approved buckets
        if (approved.length > 0) {
            PaymentBucket storage bucket = approved[approved.length-1];
            
            //if the most recent approved bucket has anything to approve
            if (bucket.paymentList.status == STATE_APPROVED && bucket.total > 0) {
                bucket.paymentList.status = STATE_PROCESSED;
            }
            
            approvedFunds[receiver] = 0;
        }
    }
    
    function _getPendingPayment(address receiver, uint256 orderId) internal view returns (PaymentRecord storage) {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        if (index > 0) {
            index -= 1;
        }
        
        //TODO: if index == 0, it means there's no record; so do something good here
        
        return pendingBuckets[receiver].paymentList.payments[index];
    }
    
    function _paymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        return (index > 0);
    }
    
    function _pendingPaymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        return (
            index > 0 && 
            pendingBuckets[receiver].paymentList.payments.length >= index && 
            pendingBuckets[receiver].paymentList.payments[index-1].orderId == orderId
        );
    }
}