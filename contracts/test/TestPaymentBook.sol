// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "../PaymentBook.sol";
import "hardhat/console.sol";

contract TestPaymentBook is PaymentBook
{
    function _assert(bool condition, string memory message) public pure {
        if (!condition) revert(message);
    }
    
    function _addTestPaymentsToBucket(address receiver, address payer, uint256 bucketIndex) internal {
        _addPaymentToBucket(bucketIndex, receiver, 1, payer, 1000);
        _addPaymentToBucket(bucketIndex, receiver, 2, payer, 2000);
        _addPaymentToBucket(bucketIndex, receiver, 3, payer, 3000);
    }
    
    function _addTestPaymentsToPending(address receiver, address payer) internal {
        _addPayment(receiver, 1, payer, 1000); 
        _addPayment(receiver, 2, payer, 2000); 
        _addPayment(receiver, 3, payer, 3000); 
    }
    
    function setBucketState(address receiver, uint256 bucketIndex, uint8 newState) public {
        paymentBuckets[receiver][bucketIndex-1].state = newState;
    }
    
    function getBucketCount(address receiver) public view returns (uint256) {
        return paymentBuckets[receiver].length;
    }
    
    function getBucketIndexWithState(address receiver, uint8 state) public view returns (uint256) {
        return _getBucketIndexWithState(receiver, state);
    }
}