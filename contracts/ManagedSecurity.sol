// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Context.sol"; 
import "./interfaces/ISecurityManager.sol"; 

/**
 * @title ManagedSecurity 
 * 
 * This is an abstract base class for contracts whose security is managed by { SecurityManager }. It exposes 
 * the modifier which calls back to the associated { SecurityManager } contract. 
 * 
 * See also { SecurityManager }
 * 
 * @author John R. Kosinski
 * LoadPipe 2024
 * All rights reserved. Unauthorized use prohibited.
 */
abstract contract ManagedSecurity is Context { 
    ISecurityManager public securityManager; 
    
    //security roles 
    bytes32 public constant ADMIN_ROLE = 0x0;
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant SYSTEM_ROLE = keccak256("SYSTEM_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant REFUNDER_ROLE = keccak256("REFUNDER_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    
    //thrown when the onlyRole modifier reverts 
    error UnauthorizedAccess(bytes32 roleId, address addr); 
    
    //thrown if zero-address argument passed for securityManager
    error ZeroAddressArgument(); 
    
    //Restricts function calls to callers that have a specified security role only 
    modifier onlyRole(bytes32 role) {
        if (!securityManager.hasRole(role, _msgSender())) {
            revert UnauthorizedAccess(role, _msgSender());
        }
        _;
    }
    
    /**
     * Allows an authorized caller to set the securityManager address. 
     * 
     * Reverts: 
     * - {UnauthorizedAccess}: if caller is not authorized 
     * - {ZeroAddressArgument}: if the address passed is 0x0
     * - 'Address: low-level delegate call failed' (if `_securityManager` is not legit)
     * 
     * @param _securityManager Address of an ISecurityManager. 
     */
    function setSecurityManager(ISecurityManager _securityManager) external onlyRole(ADMIN_ROLE) {
        _setSecurityManager(_securityManager); 
    }
    
    /**
     * This call helps to check that a given address is a legitimate SecurityManager contract, by 
     * attempting to call one of its read-only methods. If it fails, this function will revert. 
     * 
     * @param _securityManager The address to check & verify 
     */
    function _setSecurityManager(ISecurityManager _securityManager) internal {
        
        //address can't be zero
        if (address(_securityManager) == address(0)) 
            revert ZeroAddressArgument(); 
            
        //this line will fail if security manager is invalid address
        _securityManager.hasRole(ADMIN_ROLE, address(this)); 
        
        //set the security manager
        securityManager = _securityManager;
    }
    
    //future-proof, as this is inherited by upgradeable contracts
    uint256[50] private __gap;
}