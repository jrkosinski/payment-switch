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
     * @param tokenAddress Address of the token to be used as payment.
     */
    constructor(IMasterSwitch masterSwitch, IERC20 tokenAddress) PaymentSwitchBase(masterSwitch) {
        token = tokenAddress;
    }
    
    /**
     * Accepts a payment from a seller to a buyer. 
     * 
     * @param seller Address to which the majority of the payment (minus fee) is due. 
     * @param payment Encapsulates the payment data. 
     */
    function placePayment(address seller, Payment calldata payment) external {
        //amount should have been pre-approved; otherwise will revert 
        token.transferFrom(msg.sender, address(this), payment.amount);
        
        _onPaymentReceived(seller, payment);
    }
    
    /**
     * Overridden to send payment in the designated token.
     */
    function _doSendPayment(address receiver, uint256 amount) internal override returns (bool) {
        return token.transfer(receiver, amount);
    }
}