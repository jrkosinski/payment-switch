// SPDX-License-Identifier: UNLICENSED
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20
{
    constructor(string memory name, string memory symbol) ERC20(name, symbol) { 
    }
}