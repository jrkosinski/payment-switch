// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./PaymentSwitchBase.sol";
import "hardhat/console.sol";

/**
 * @title PaymentSwitchNative
 * 
 * Takes in funds from marketplace, extracts a fee, and batches the payments for transfer
 * to the appropriate parties, holding the funds in escrow in the meantime. Deals with 
 * native ETH only.
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
contract PaymentSwitchNative is PaymentSwitchBase
{
    /**
     * Constructor. 
     * 
     * @param masterSwitch Address of the master switch contract.
     */
    constructor(IMasterSwitch masterSwitch) PaymentSwitchBase(masterSwitch) {
    }
    
    function tokenAddress() external pure returns (address) { return address(0); }
    
    /**
     * Accepts a payment from a seller to a buyer. 
     * 
     * @param payment Encapsulates the payment input data. 
     */
    function placePayment(PaymentInput calldata payment) external payable whenNotPaused {
        //check that the amount is correct
        if (payment.amount > msg.value)
            revert PaymentAmountMismatch(payment.amount, msg.value);
            
        //TODO: (MED) check that payer == msg.sender 
            
        _onPaymentReceived(payment);
    }
    
    /**
     */
    function placeMultiPayments(PaymentInput[] calldata payments) external payable whenNotPaused {
        uint256 total = 0;
        
        //get total amount of all payments, check against amount sent 
        for(uint256 n=0; n<payments.length; n++) {
            total += payments[n].amount;
            _onPaymentReceived(payments[n]);
        }
        
        //if payment is insufficient, revert 
        if (total > msg.value) {
            revert PaymentAmountMismatch(total, msg.value);
        }
    }
    
    /**
     * Overridden to send payment in native ETH.
     */
    function _doSendPayment(address receiver, uint256 amount) internal override returns (bool) {
        (bool success,) = payable(receiver).call{value: amount}("");
        return success;
    }
}