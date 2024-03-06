// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "../PaymentInput.sol"; 

interface IPaymentSwitch
{
    function tokenAddress() external returns (address); 
    function placePayment(PaymentInput calldata payment) external;
    function placeMultiPayments(PaymentInput[] calldata payments) external;
}