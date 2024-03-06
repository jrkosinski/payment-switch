// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./PaymentSwitchBase.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 

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
contract PaymentSwitchToken is PaymentSwitchBase
{
    IERC20 public token; 
    
    /**
     * Constructor. 
     * 
     * @param masterSwitch Address of the master switch contract.
     * @param _tokenAddress Address of the token to be used as payment.
     */
    constructor(IMasterSwitch masterSwitch, IERC20 _tokenAddress) PaymentSwitchBase(masterSwitch) {
        token = _tokenAddress;
    }
    
    function tokenAddress() external view returns (address) { return address(token); }
    
    /**
     * Accepts a payment from a seller to a buyer. 
     * 
     * @param payment Encapsulates the payment data. 
     */
    function placePayment(PaymentInput calldata payment) external whenNotPaused {
        //amount should have been pre-approved; otherwise will revert 
        token.transferFrom(msg.sender, address(this), payment.amount);
        
        _onPaymentReceived(payment);
    }
    
    /**
     * 
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
     * Overridden to send payment in the designated token.
     */
    function _doSendPayment(address receiver, uint256 amount) internal override returns (bool) {
        return token.transfer(receiver, amount);
    }
}