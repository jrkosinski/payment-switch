// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./security/HasSecurityContext.sol"; 

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
}