// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "./ManagedSecurity.sol"; 

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
contract MasterSwitch is ManagedSecurity
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
     * @param securityManager Contract which will manage secure access for this contract. 
     * @param vault Recipient of the extracted fees. 
     * @param _feeBps BPS defining the fee portion of each payment. 
     */
    constructor(ISecurityManager securityManager, address vault, uint256 _feeBps) {
        _setSecurityManager(securityManager);
        vaultAddress = vault;
        feeBps = _feeBps;
    }
    
    /**
     * The DAO is allowed to change the fee portion. 
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
     * The DAO is allowed to change the address to which fees are sent. 
     * 
     * @param _vaultAddress The new address. 
     */
    function setVaultAddress(address _vaultAddress) public onlyRole(DAO_ROLE) {
        if (_vaultAddress != vaultAddress) {
            vaultAddress = _vaultAddress;
            emit VaultAddressChanged(_vaultAddress, msg.sender); //TODO: TEST
        }
    }
}