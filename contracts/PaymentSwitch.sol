// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./ManagedSecurity.sol"; 
import "./PaymentBook.sol"; 
import "./utils/CarefulMath.sol"; 

//TODO: add security restrictions 
//TODO: multi-payment orders 
//TODO: order batches for approval 

/**
 * @title PaymentSwitch
 * 
 * Takes in funds from marketplace, extracts a fee, and batches the payments for transfer
 * to the appropriate parties, holding the funds in escrow in the meantime. 
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
contract PaymentSwitch is ManagedSecurity, PaymentBook //TODO: compose instead of inherit
{
    //how much fee is charged per payment (in bps)
    uint256 public feeBps; 
    
    //address to which the fee charged (profit) is sent
    address public vaultAddress;
    
    //final approval - amount to pay out to various parties
    mapping(address => uint256) internal toPayOut; 
    
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
    event VaultAddressChanged (
        address newAddress,
        address changedBy
    );
    event FeeBpsChanged (
        uint256 newValue,
        address changedBy
    );
    
    
    //ERRORS 
    error PaymentAmountMismatch(uint256 amount1, uint256 amount2);
    error InvalidOrderId(uint256 orderId);
    error PaymentFailed(address receiver);
    
    
    /**
     * Constructor. 
     * 
     * @param securityManager Contract which will manage secure access for this contract. 
     * @param vault Recipient of the extracted fees. 
     * @param _feeBps BPS defining the fee portion of each payment. 
     */
    constructor(ISecurityManager securityManager, address vault, uint256 _feeBps) {
        _setSecurityManager(securityManager);
        setVaultAddress(vault);
        setFeeBps(_feeBps);
    }
    
    /**
     * The DAO is allowed to change the fee portion. 
     * 
     * @param _feeBps BPS defining the fee portion of each payment. 
     */
    function setFeeBps(uint256 _feeBps) public onlyRole(DAO_ROLE) {
        if (feeBps != _feeBps) {
            feeBps = _feeBps;
            emit FeeBpsChanged(_feeBps, msg.sender); //TODO: test
        }
    }

    /**
     * The DAO is allowed to change the address to which fees are sent. 
     * 
     * @param _vaultAddress The new address. 
     */
    function setVaultAddress(address _vaultAddress) public onlyRole(DAO_ROLE) {
        if (_vaultAddress != vaultAddress) {
            vaultAddress = _vaultAddress;
            emit VaultAddressChanged(_vaultAddress, msg.sender); //TODO: test
        }
    }
    
    /**
     * Accepts a payment from a seller to a buyer. 
     * 
     * @param seller Address to which the majority of the payment (minus fee) is due. 
     * @param payment Encapsulates the payment data. 
     */
    function placePayment(address seller, PaymentRecord calldata payment) external payable onlyRole(SYSTEM_ROLE) {
        //check that the amount is correct
        if (payment.amount != msg.value)
            revert PaymentAmountMismatch(payment.amount, msg.value);
        
        //add payment to book
        _addPendingPayment(seller, payment.orderId, payment.payer, payment.amount);     
        
        //event 
        emit PaymentPlaced( //TODO: add order id 
            payment.payer, 
            seller, 
            payment.amount
        );
    }
    
    /**
     * Nullifies a payment by removing it from records (does not refund it) 
     * 
     * @param receiver Intended receiver of the payment to be removed.
     * @param orderId Identifier of the order for which the payment was placed.
     */
    function removePayment(address receiver, uint256 orderId) external onlyRole(SYSTEM_ROLE) {
        _removePendingPayment(receiver, orderId); 
    }
    
    /**
     * Refunds and removes the identified payment. 
     * 
     * @param receiver Intended receiver of the payment to be refunded.
     * @param orderId Identifier of the order for which the payment was placed.
     */
    function refundPayment(address receiver, uint256 orderId) external onlyRole(REFUNDER_ROLE) {
        PaymentRecord storage payment = _getPendingPayment(receiver, orderId); 
        
        //throw if order invalid 
        if (payment.payer == address(0)) {
            revert InvalidOrderId(orderId);
        }
        
        if (payment.amount > 0) {

            //place refund amount into bucker for payer
            toPayOut[payment.payer] += payment.amount;
            
            //process in payment book   
            payment.refunded = true;
            _removePendingPayment(receiver, orderId); 
        }
    }
    
    //TODO: replace with approveBatch
    function approvePayments(address receiver) external onlyRole(APPROVER_ROLE) {
        _approvePendingBucket(receiver);
    }
    
    //TODO: replace with processBatch
    function processPayments(address receiver) external onlyRole(DAO_ROLE) {
        uint256 amount = approvedFunds[receiver]; 
        
        //break off fee 
        uint256 fee = 0;
        if (feeBps > 0) {
            fee = CarefulMath.div(amount, feeBps);
            if (fee > amount)
                fee = 0;
        }
        uint256 toReceiver = amount - fee; 
        
        //set the amounts to pay out 
        toPayOut[receiver] += toReceiver; 
        toPayOut[vaultAddress] += fee; 
        
        //process the payment book 
        _processApprovedBucket(receiver);
    }
    
    /**
     * Causes all due payment to be pushed to the specified receiver. 
     * 
     * @param receiver The receiver of the payments to push. 
     */
    function pushPayment(address receiver) external onlyRole(DAO_ROLE) {
        _sendPayment(payable(receiver)); 
    }
    
    /**
     * Pulls all currently due payments to the caller. 
     */
    function pullPayment() external  {
        //TODO: implement 
    }
    
    /**
     * Gets the specified payment, if it exists
     * 
     * @param receiver The receiver of the payment. 
     * @param orderId Identifier for the order for which the payment was placed. 
     */
    function getPendingPayment(address receiver, uint256 orderId) public view returns (PaymentRecord memory) {
        PaymentRecord memory payment;
        if (_paymentExists(receiver, orderId)) 
            payment = _getPendingPayment(receiver, orderId);
        return payment;
    }
    
    //TODO: protect against reentrancy
    /**
     * Does the actual work of sending a payment (whether pull or push) to the intended
     * recipient. 
     * 
     * @param receiver The address of the recipient of payment. 
     */
    function _sendPayment(address payable receiver) internal {
        uint256 amount = toPayOut[receiver]; 
    
        //checks: 
        if (amount > 0) {
            
            //effects: zero out the approved funds pot
            toPayOut[receiver] = 0;
            
            //interactions: transfer 
            receiver.transfer(amount);
            (bool success,) = receiver.call{value: msg.value}("");
            
            if (!success)
                revert PaymentFailed(receiver);
            //TODO: test failed payment
            
            //emit event 
            emit PaymentSent(receiver, amount, success); //TODO: test
        }
    }
}