// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./security/HasSecurityContext.sol"; 
import "./PaymentInput.sol";
import "./interfaces/IPaymentSwitch.sol"; 
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct MultiPaymentInput 
{
    address receiver; 
    address currency; //token address, or 0x0 for native 
    PaymentInput[] payments;
}

/**
 * @title MasterSwitch
 * 
 * Takes in funds from marketplace, extracts a fee, and batches the payments for transfer
 * to the appropriate parties, holding the funds in escrow in the meantime. 
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
contract MasterSwitch is HasSecurityContext
{
    //how much fee is charged per payment (in bps)
    uint256 public feeBps; 
    
    //address to which the fee charged (profit) is sent
    address public vaultAddress;
    
    mapping(address => address) tokensToSwitches;
    
    //EVENTS 
    event VaultAddressChanged (
        address newAddress,
        address changedBy
    );
    
    event FeeBpsChanged (
        uint256 newValue,
        address changedBy
    );
    
    
    /**
     * Constructor. 
     * 
     * Emits: 
     * - {HasSecurityContext-SecurityContextSet}
     * 
     * Reverts: 
     * - {ZeroAddressArgument} if the securityContext address is 0x0. 
     * 
     * @param securityContext Contract which will define & manage secure access for this contract. 
     * @param vault Recipient of the extracted fees. 
     * @param _feeBps BPS defining the fee portion of each payment. 
     */
    constructor(ISecurityContext securityContext, address vault, uint256 _feeBps) {
        _setSecurityContext(securityContext);
        vaultAddress = vault;
        feeBps = _feeBps;
    }
    
    /**
     * Sets the fee portion as a number of basis points. 
     * 
     * Emits: 
     * - {MasterSwitch-FeeBpsChanged} 
     * 
     * Reverts: 
     * - 'AccessControl:' if caller is not authorized as DAO_ROLE. 
     * 
     * @param _feeBps BPS defining the fee portion of each payment. 
     */
    function setFeeBps(uint256 _feeBps) public onlyRole(DAO_ROLE) {
        if (feeBps != _feeBps) {
            feeBps = _feeBps;
            emit FeeBpsChanged(_feeBps, msg.sender); //TODO: TEST
        }
    }

    /**
     * Sets the address to which fees are sent. 
     * 
     * Emits: 
     * - {MasterSwitch-VaultAddressChanged} 
     * 
     * Reverts: 
     * - 'AccessControl:' if caller is not authorized as DAO_ROLE. 
     * 
     * @param _vaultAddress The new address. 
     */
    function setVaultAddress(address _vaultAddress) public onlyRole(DAO_ROLE) {
        if (_vaultAddress != vaultAddress) {
            vaultAddress = _vaultAddress;
            emit VaultAddressChanged(_vaultAddress, msg.sender);
        }
    }
    
    function placeMultiPayments(MultiPaymentInput[] calldata multiPayments) public payable onlyRole(SYSTEM_ROLE) {
        //approve tokens on behalf of 
        for(uint256 i=0; i<multiPayments.length; i++) {
            address currency = multiPayments[i].currency; 
            IPaymentSwitch paymentSwitch = IPaymentSwitch(tokensToSwitches[currency]);
            PaymentInput[] memory payments = multiPayments[i].payments; 
            
            for (uint256 n=0; n<payments.length; n++) {
                
                if (currency != address(0)) {
                    IERC20 token = IERC20(currency);
                    token.approve(address(paymentSwitch), payments[n].amount); 
                }
            
                //call for individual payments
            }
                
            paymentSwitch.placeMultiPayments(payments);
        }
    }
}