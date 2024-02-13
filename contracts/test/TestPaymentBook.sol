// SPDX-License-Identifier: UNLICENSED
import "../PaymentBook.sol";

contract TestPaymentBook is PaymentBook
{
    function addPendingPayment(address receiver, uint256 orderId, address payer, uint256 amount) external {
        _addPendingPayment(receiver, orderId, payer, amount);
    }
    
    function removePendingPayment(address receiver, uint256 orderId) external {
        _removePendingPayment(receiver, orderId);
    }
    
    function approvePendingBucket(address receiver) external {
        _approvePendingBucket(receiver);
    }
    
    function processApprovedBucket(address receiver) external {
        _processApprovedBucket(receiver);
    }
}