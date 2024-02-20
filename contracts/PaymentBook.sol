// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "hardhat/console.sol";

//TODO: batch for removed payments (while in dispute or processing) 
//TODO: move removed payment back into a batch 
//TODO: cut off pending batch for approval 

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
    mapping(address => PaymentBucket[]) internal paymentBuckets; 
    
    mapping(address => mapping(uint256 => uint256)) internal orderIdsToIndexes;  //TODO: this needs epochs or it will cause problems
    mapping(address => uint256) internal approvedFunds;
    
    //enum 
    uint8 constant STATE_PENDING = 1;
    uint8 constant STATE_READY = 2;
    uint8 constant STATE_APPROVED = 3;
    uint8 constant STATE_PROCESSED = 4;
    
    //errors
    error DuplicateEntry();
    
    struct PaymentBucket 
    {
        uint256 total;
        PaymentRecord[] payments;
        uint8 state;
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
    
    function getAmountOwed(address receiver) public view returns (uint256) {
        return approvedFunds[receiver]; 
    }
    
    function getAmountPending(address receiver) public view returns (uint256) {
        if (_hasPendingBucket(receiver))
            return _getPendingBucket(receiver).total; 
        return 0;
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
        if (orderIdsToIndexes[receiver][orderId] > 0) {
            //if duplicate, add to the amount 
            PaymentRecord storage payment = _getPendingPayment(receiver, orderId); 
            payment.amount += amount;
        } else {
            //add the new payment record to the pending bucket
            pendingBucket.payments.push(PaymentRecord(orderId, payer, amount, false));
            orderIdsToIndexes[receiver][orderId] = pendingBucket.payments.length;
        }
        
        pendingBucket.total += amount;
    }
    
    function _removePendingPayment(address receiver, uint256 orderId) internal {
        if (_hasPendingBucket(receiver)) {
            uint256 index = orderIdsToIndexes[receiver][orderId]; 
            if (index > 0) {
                //TODO: should pull from ready-to-approve bucket 
                PaymentBucket storage pendingBucket = _getPendingBucket(receiver);
                PaymentRecord storage payment = pendingBucket.payments[index-1];  
                payment.orderId = 0;
                pendingBucket.total -= payment.amount; 
                payment.amount = 0;
            }
        }
    }
    
    function _approveReadyBucket(address receiver) internal {
        if (_hasReadyBucket(receiver)) {
            //get a reference to the ready bucket
            PaymentBucket storage pending = _getReadyBucket(receiver);
            
            //don't allow approval unless all approved buckets are processed first
            if (_hasApprovedBucket(receiver))
                revert("already has approved bucket"); //TODO: better revert error 
            
            //push that copy to approved by adding a new bucket on top 
            _appendBucket(receiver);
            
            //record the amount 
            approvedFunds[receiver] += pending.total;
        }
    }
    
    function _processApprovedBucket(address receiver) internal {
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
            
        approvedFunds[receiver] = 0;
    }
    
    function _getPendingPayment(address receiver, uint256 orderId) internal view returns (PaymentRecord storage) {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        if (index > 0) {
            index -= 1;
        }
        
        //TODO: if index == 0, it means there's no record; so do something good here
        
        return _getPendingBucket(receiver).payments[index];
    }
    
    function _paymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        return (index > 0);
    }
    
    function _pendingPaymentExists(address receiver, uint256 orderId) internal view returns (bool) {
        uint256 index = orderIdsToIndexes[receiver][orderId]; 
        bool output = false; 
        
        if (index > 0 && _hasPendingBucket(receiver)) {
            PaymentBucket storage pendingBucket = _getPendingBucket(receiver);
            output = pendingBucket.payments.length >= index && 
                pendingBucket.payments[index-1].orderId == orderId;
        }
        
        return output;
    }
    
    function _hasPendingBucket(address receiver) internal view returns (bool) {
        return paymentBuckets[receiver].length > 0;
    }
    
    function _hasReadyBucket(address receiver) internal view returns (bool) {
        PaymentBucket[] memory buckets = paymentBuckets[receiver];
        return buckets.length > 1 && buckets[buckets.length-2].state == STATE_READY;
    }
    
    function _hasApprovedBucket(address receiver) internal view returns (bool) {
        PaymentBucket[] memory buckets = paymentBuckets[receiver]; 
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
        
        //if no buckets yet, first one is pending 
        if (buckets.length == 0) {
            buckets.push();
            buckets[0].state = STATE_PENDING;
            return true;
        }
        
        //not allowed to have two ready or two pending buckets at once
        if (buckets.length > 1 && buckets[buckets.length-2].state <= STATE_READY)
            return false;
            
        buckets.push();
        
        //pending bucket becomes ready bucket; new bucket is pending
        buckets[buckets.length-1].state = STATE_PENDING;
        buckets[buckets.length-2].state = STATE_READY;
        
        return true;
    }
}