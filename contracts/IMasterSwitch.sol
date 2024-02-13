// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface IMasterSwitch
{
    function feeBps() external returns (uint256); 
    function vaultAddress() external returns (address); 
    function securityManager() external returns (address); 
}