// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20
{
    constructor(string memory name, string memory symbol) ERC20(name, symbol) { 
    }
    
    function mintToCaller(uint256 amount) external {
        _mint(msg.sender, amount);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}