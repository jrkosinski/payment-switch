// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

/**
 * @title IMasterSwitch 
 * 
 * Interface for a the switch's parent context that controls access to the fee percentage (bps),
 * the vault address, and other shared global properties and data. 
 * 
 * See also { MasterSwitch }
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
interface IMasterSwitch
{
    /**
     * Gets the number of basis points taken as fee from each transaction. 
     * (as basis points - 10,000 is 100%, 100 is 1%)
     * 
     * @return uint256 
     */
    function feeBps() external returns (uint256); 
    
    /**
     * Gets the address of the DAO vault into which fees are deposited.
     * 
     * @return address 
     */
    function vaultAddress() external returns (address); 
    
    /**
     * Gets the address of the SecurityContext contract in which the security roles and 
     * access are defined. 
     * 
     * @return address 
     */
    function securityContext() external returns (address); 
}