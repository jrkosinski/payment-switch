// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

/* Encapsulates information about an incoming payment
*/
struct PaymentInput
{
    uint256 id;
    address receiver;
    address payer;
    uint256 amount;
}