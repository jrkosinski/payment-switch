// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./ManagedSecurity.sol"; 
import "./PaymentBook.sol"; 
import "./utils/CarefulMath.sol"; 

//TODO: add security restrictions 
//TODO: multi-payment orders 
//TODO: order batches for approval 


contract PaymentSwitch is ManagedSecurity, PaymentBook //TODO: compose instead of inherit
{
    //how much fee is charged per payment (in bps)
    uint256 public feeBps; 
    
    //address to which the fee charged (profit) is sent
    address public vaultAddress;
    
    //final approval - amount to pay out to various parties
    mapping(address => uint256) internal toPayOut; 
    
    //events 
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
    
    
    //errors 
    error PaymentAmountMismatch(uint256 amount1, uint256 amount2);
    error InvalidOrderId(uint256 orderId);
    
    
    constructor(ISecurityManager securityManager, address vault, uint256 _feeBps) {
        _setSecurityManager(securityManager);
        setVaultAddress(vault);
        setFeeBps(_feeBps);
    }
    
    function setFeeBps(uint256 _feeBps) public payable /*onlyRole(MOLOCH_ROLE)*/ {
        feeBps = _feeBps;
        emit FeeBpsChanged(_feeBps, msg.sender); //TODO: test
    }

    function setVaultAddress(address _vaultAddress) public payable /*onlyRole(MOLOCH_ROLE)*/ {
        vaultAddress = _vaultAddress;
        emit VaultAddressChanged(_vaultAddress, msg.sender); //TODO: test
    }
    
    function placePayment(address seller, PaymentRecord calldata payment) external payable /*onlyRole(SYSTEM_ROLE)*/ {
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
    
    function removePayment(address receiver, uint256 orderId) external payable /*onlyRole(SYSTEM_ROLE)*/ {
        _removePendingPayment(receiver, orderId); 
    }
    
    function refundPayment(address receiver, uint256 orderId) external /*onlyRole(REFUNDER_ROLE)*/ {
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
    function approvePayments(address receiver) external /*onlyRole(APPROVER_ROLE)*/ {
        _approvePendingBucket(receiver);
    }
    
    //TODO: replace with processBatch
    function processPayments(address receiver) external /*onlyRole(MOLOCH_ROLE)*/ {
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
    
    function pushPayment(address receiver) external /*onlyRole(MOLOCK_ROLE) */ {
        _sendPayment(payable(receiver)); 
    }
    
    function pullPayment() external  {
        //TODO: implement 
    }
    
    function getPendingPayment(address receiver, uint256 orderId) public view returns (PaymentRecord memory) {
        PaymentRecord memory payment;
        if (_paymentExists(receiver, orderId)) 
            payment = _getPendingPayment(receiver, orderId);
        return payment;
    }
    
    //TODO: protect against reentrancy
    function _sendPayment(address payable receiver) internal {
        uint256 amount = toPayOut[receiver]; 
         
        if (amount > 0) {
            
            //zero out the approved funds pot
            toPayOut[receiver] = 0;
            
            //transfer 
            receiver.transfer(amount);
            (bool success,) = receiver.call{value: msg.value}("");
            
            if (!success)
                revert("failed payment"); //TODO: custom error
            //TODO: test failed payment
            
            //emit event 
            emit PaymentSent(receiver, amount, success); //TODO: test
        }
    }
}