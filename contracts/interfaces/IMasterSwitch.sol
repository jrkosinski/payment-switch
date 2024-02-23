// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

//TODO: comment 
interface IMasterSwitch
{
    function feeBps() external returns (uint256); 
    function vaultAddress() external returns (address); 
    function securityManager() external returns (address); 
}