// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./security/HasSecurityContext.sol"; 
import "./PaymentBook.sol"; 
import "./interfaces/IMasterSwitch.sol";
import "./utils/CarefulMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; 

//TODO: a way to change master switch address 
//TODO: a way to retrieve payment that's been unclaimed 

/**
 * @title PaymentSwitchBase
 * 
 * Takes in funds from marketplace, extracts a fee, and batches the payments for transfer
 * to the appropriate parties, holding the funds in escrow in the meantime. This is the 
 * base class from which native payment switches & token-based switches derive.
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
contract PaymentSwitchBase is HasSecurityContext, PaymentBook, ReentrancyGuard 
    //TODO: consider composing PaymentBook instead of inheriting
{
    //final approval - amount to pay out to various parties
    mapping(address => uint256) internal toPayOut;  // receiver -> amount to pay
    
    //master switch reference 
    IMasterSwitch public masterSwitch;
    
    //EVENTS 
    event PaymentPlaced (
        address indexed payer, 
        address indexed receiver, 
        uint256 amount
    );
    event PaymentSent ( 
        address indexed receiver, 
        uint256 amount, 
        bool success
    );
    event PaymentRefunded (
        uint256 indexed id,
        uint256 refundAmount
    );
    
    //ERRORS 
    error PaymentAmountMismatch(uint256 amount1, uint256 amount2);
    error InvalidOrderId(uint256 id);
    error InvalidOrderState(uint256 id, uint8 state);
    error InvalidRefundAmount(uint256 id, uint256 amount);
    error PaymentFailed(address receiver);
    
    /**
     * Constructor. 
     * 
     * Emits: 
     * - {HasSecurityContext-SecurityContextSet}
     * 
     * Reverts: 
     * - {ZeroAddressArgument} if the securityContext address is 0x0. 
     * 
     * @param _masterSwitch Address of the master switch contract.
     */
    constructor(IMasterSwitch _masterSwitch) {
        _setSecurityContext(ISecurityContext(_masterSwitch.securityContext())); 
        masterSwitch = _masterSwitch;
    }
    
    /**
     * Removes a payment from its current bucket, and moves it into the designated 
     * 'for review' bucket. 
     * 
     * Emits: 
     * - //TODO: inherits emits of _removePayment 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _removePayment 
     * - 'AccessControl:' if caller is not authorized as APPROVER_ROLE. 
     * 
     * @param id Identifier of the payment to move.
     */
    function reviewPayment(uint256 id) external onlyRole(APPROVER_ROLE) {
        PaymentWithState memory payment = getPaymentById(id); 
        if (payment.state != STATE_PENDING && payment.state != STATE_READY) {
            revert InvalidOrderState(id, payment.state); 
        }
        
        _movePayment(id, 1); 
    }
    
    /**
     * Refunds all or part of the original payment. If the payment is fully refunded, then 
     * it will also be removed.
     * 
     * Emits: 
     * - //TODO: inherits emits of _refundPayment 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _refundPayment 
     * - 'AccessControl:' if caller is not authorized as REFUNDER_ROLE. 
     * 
     * @param id Identifier of the order for which the payment was placed.
     * @param amount The amount to refund, cannot exceed remaining payment amount.
     */
    function refundPayment(uint256 id, uint256 amount) external onlyRole(REFUNDER_ROLE) {
        _refundPayment(id, amount);
    }
    
    /**
     * Approves all current payments marked as ready, for the given receiver. 
     * 
     * Emits: 
     * - //TODO: inherits emits of _approveReadyBucket 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _approveReadyBucket 
     * - 'AccessControl:' if caller is not authorized as APPROVER_ROLE. 
     * 
     * @param receiver The receiver for whom to approve payments. 
     */
    function approvePayments(address receiver) public onlyRole(APPROVER_ROLE) {
        uint256 bucketIndex = _getBucketIndexWithState(receiver, STATE_READY); 
        if (bucketIndex > 0) {
            paymentBuckets[receiver][bucketIndex-1].state == STATE_APPROVED;
        }
    }
    
    /**
     * Approves all current payments marked as ready, for the given receiver. 
     * 
     * Emits: 
     * - //TODO: inherits emits of _approveReadyBucket 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _approveReadyBucket 
     * - 'AccessControl:' if caller is not authorized as APPROVER_ROLE. 
     * 
     * @param receivers Array of receivers for whom to approve payments. 
     */
    function approvePaymentsBatch(address[] calldata receivers) external onlyRole(APPROVER_ROLE) {
        for(uint256 n=0; n<receivers.length; n++) {
            approvePayments(receivers[n]);
        }
    }
    
    /**
     * Takes all currently pending payments for the given receiver, and moves them to 
     * a ready bucket. A new empty pending bucket will be added for the given receiver.
     * 
     * Emits: 
     * - //TODO: inherits emits of _pendingToReady 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _pendingToReady 
     * - 'AccessControl:' if caller is not authorized as APPROVER_ROLE. 
     * 
     * @param receiver Address of receiver for whom to freeze pending payments. 
     */
    function freezePending(address receiver) public onlyRole(APPROVER_ROLE) {
        _appendBucket(receiver);
    }
    
    /**
     * Takes all currently pending payments for each of the receivers in the given array, 
     * and moves them to a ready bucket. A new empty pending bucket will be added for each 
     * of the given receivers.
     * 
     * Emits: 
     * - //TODO: inherits emits of _pendingToReady 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _pendingToReady 
     * - 'AccessControl:' if caller is not authorized as APPROVER_ROLE. 
     * 
     * @param receivers Array of receivers for whom to approve payments. 
     */
    function freezePendingBatch(address[] calldata receivers) external onlyRole(APPROVER_ROLE) {
        for(uint256 n=0; n<receivers.length; n++) {
            freezePending(receivers[n]);
        }
    }
    
    /**
     * Processes all currently approved payments for the given receiver. 
     * 
     * Emits: 
     * - //TODO: inherits emits of _processApprovedBuckets 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _processApprovedBuckets 
     * - 'AccessControl:' if caller is not authorized as DAO_ROLE. 
     * 
     * @param receiver Address of receiver for whom to process approved payments. 
     */
    function processPayments(address receiver) public onlyRole(DAO_ROLE) {
        uint256 amount = _getTotalInState(receiver, STATE_APPROVED);
        
        //break off fee 
        uint256 fee = 0;
        uint256 feeBps = masterSwitch.feeBps();
        if (feeBps > 0) {
            fee = CarefulMath.div(amount, feeBps);
            if (fee > amount)
                fee = 0;
        }
        uint256 toReceiver = amount - fee; 
        
        //set the amounts to pay out 
        toPayOut[receiver] += toReceiver; 
        toPayOut[masterSwitch.vaultAddress()] += fee; 
        
        //process the payment book 
        _processApprovedBuckets(receiver);
    }
    
    /**
     * Processes all currently approved payments for each of the receivers in the given 
     * array. 
     * 
     * Emits: 
     * - //TODO: inherits emits of _processApprovedBuckets 
     * 
     * Reverts: 
     * - //TODO: inherits reverts of _processApprovedBuckets 
     * - 'AccessControl:' if caller is not authorized as DAO_ROLE. 
     * 
     * @param receivers Array of receivers for whom to process payments. 
     */
    function processPaymentsBatch(address[] calldata receivers) external onlyRole(DAO_ROLE) {
        for(uint256 n=0; n<receivers.length; n++) {
            processPayments(receivers[n]);
        }
    }
    
    /**
     * Causes all currently due payment to be pushed to the specified receiver. 
     * 
     * Emits: 
     * - {PaymentSent} when the operation succeeds. 
     * 
     * Reverts: 
     * - {PaymentFailed} if the push payment fails. 
     * - 'AccessControl:' if caller is not authorized as DAO_ROLE. 
     * 
     * @param receiver The receiver of the payments to push. 
     */
    function pushPayment(address receiver) external onlyRole(DAO_ROLE) {
        _sendPayment(payable(receiver)); 
    }
    
    /**
     * Pulls all currently due payments to the caller. 
     * 
     * //TODO: implement & comment 
     */
    function pullPayment() external  {
    }
    
    /**
     * Performs a full or partial refund of the specified payment. This means that the 
     * amount specified will be subtracted from the payment amount, and credited to the 
     * payer. 
     * 
     * @param id Identifies the payment being fully or partially refunded. 
     * @param refundAmount The amount to refund; cannot exceed the original or remaining amount 
     * of the specified payment. If this value is zero, the FULL payment amount will be refunded.
     */
    function _refundPayment(uint256 id, uint256 refundAmount) internal nonReentrant {
        
        //get the payment to refund
        PaymentAddress memory location = paymentAddresses[id];
        
        //throw if order invalid 
        if (location.bucketIndex < 1 || location.paymentIndex < 1) {
            revert InvalidOrderId(id);
        }
        
        PaymentBucket storage bucket = paymentBuckets[location.receiver][location.bucketIndex-1];
        
        //throw if bucket state is invalid 
        if (bucket.state == STATE_APPROVED || bucket.state == STATE_PROCESSED) {
            revert InvalidOrderState(id, bucket.state);
        }
        
        //get the payment
        Payment storage payment = bucket.payments[location.paymentIndex-1];
        
        if (payment.amount > 0) {
            
            //if no amount passed in, use the whole payment amount 
            if (refundAmount == 0) 
                refundAmount = payment.amount;
        
            //refund amount can't be greater than the original payment 
            if (refundAmount > payment.amount) {
                revert InvalidRefundAmount(id, refundAmount);
            }

            //place refund amount into bucket for payer
            payment.refundAmount = refundAmount;
            payment.amount -= refundAmount;
            toPayOut[payment.payer] += refundAmount;
        }
    }
    
    /**
     * Does the actual work of sending a payment (whether pull or push) to the intended
     * recipient. 
     * 
     * @param receiver The address of the recipient of payment. 
     */
    function _sendPayment(address receiver) virtual internal nonReentrant {
        uint256 amount = toPayOut[receiver]; 
    
        //checks: 
        if (amount > 0) {
            
            //effects: zero out the approved funds pot
            toPayOut[receiver] = 0;
            
            //interactions: transfer 
            bool success = _doSendPayment(receiver, amount);
            
            if (!success)
                revert PaymentFailed(receiver);
            //TODO: test failed payment
            
            //emit event 
            emit PaymentSent(receiver, amount, success); //TODO: test
        }
    }
    
    /**
     * This must be overridden by derived contracts; returns true unconditionally by default.
     * It's essentially an abstract function in OO parlance. 
     */
    function _doSendPayment(address /*receiver*/, uint256 /*amount*/) internal virtual returns (bool) {
        return true;
    }
    
    /**
     * This will be called by derived contracts after a payment has been recieved. 
     * 
     * @param seller The seller in the payment received. 
     * @param payment Full payment data. 
     */
    function _onPaymentReceived(address seller, Payment calldata payment) internal virtual {
        
        //add payment to book
        _addPayment(seller, payment.id, payment.payer, payment.amount);     
        
        //event 
        emit PaymentPlaced( //TODO: add order id 
            payment.payer, 
            seller, 
            payment.amount
        );
    }
}