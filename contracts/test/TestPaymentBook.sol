// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "../PaymentBook.sol";

contract TestPaymentBook is PaymentBook
{
    function addPendingPayment(address receiver, uint256 orderId, address payer, uint256 amount) external {
        _addPendingPayment(receiver, orderId, payer, amount);
    }
    
    function removePendingPayment(uint256 orderId) external {
        _removePayment(orderId);
    }
    
    function makeReadyBucket(address receiver) external {
        _appendBucket(receiver);
    }
    
    function approveReadyBucket(address receiver) external {
        _approveReadyBucket(receiver);
    }
    
    function processApprovedBuckets(address receiver) external {
        _processApprovedBuckets(receiver);
    }
    
    function getBucketCount(address receiver) external view returns (uint256) {
        return paymentBuckets[receiver].length;
    }
}