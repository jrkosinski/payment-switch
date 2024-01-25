// SPDX-License-Identifier: UNLICENSED
import "./ManagedSecurity.sol"; 
import "./PaymentBook.sol"; 
import "./utils/CarefulMath.sol"; 

//TODO: add security restrictions 
//TODO: multi-payment orders 
//TODO: order batches for approval 
//TODO: remove payment from batch 
//TODO: refund payment 


contract PaymentSwitch2 is ManagedSecurity, PaymentBook
{
    //how much fee is charged per payment (in bps)
    uint256 public feeBps; 
    
    //address to which the fee charged (profit) is sent
    address public vaultAddress;
    
    
    //events 
    event PaymentPlaced (
        address indexed payer, 
        address indexed receiver, 
        uint256 amount
    );
    event PaymentSent ( 
        address indexed receiver, 
        uint256 amount, 
        bool success
    );
    event VaultAddressChanged (
        address newAddress,
        address changedBy
    );
    event FeeBpsChanged (
        uint256 newValue,
        address changedBy
    );
    
    
    //errors 
    error PaymentAmountMismatch(uint256 amount1, uint256 amount2);
    error InvalidOrderId(uint256 orderId);
    
    
    constructor(ISecurityManager securityManager, address vault, uint256 _feeBps) {
        _setSecurityManager(securityManager);
        setVaultAddress(vault);
        setFeeBps(_feeBps);
    }
    
    function setFeeBps(uint256 _feeBps) public payable /*onlyRole(MOLOCH_ROLE)*/ {
        feeBps = _feeBps;
        emit FeeBpsChanged(_feeBps, msg.sender); //TODO: test
    }

    function setVaultAddress(address _vaultAddress) public payable /*onlyRole(MOLOCH_ROLE)*/ {
        vaultAddress = _vaultAddress;
        emit VaultAddressChanged(_vaultAddress, msg.sender); //TODO: test
    }
    
    function placePayment(address seller, PaymentRecord calldata payment) external payable /*onlyRole(SYSTEM_ROLE)*/ {
        //check that the amount is correct
        if (payment.amount != msg.value)
            revert PaymentAmountMismatch(payment.amount, msg.value);
        
        addPendingPayment(seller, payment.orderId, payment.payer, payment.amount);     
        
        //event 
        emit PaymentPlaced( //TODO: add order id 
            payment.payer, 
            seller, 
            payment.amount
        );
    }
    
    //TODO: remove this 
    function addPayment(address receiver, uint256 orderId, address payer, uint256 amount) public {
        addPendingPayment(receiver, orderId, payer, amount); 
    }
    
    //TODO: security restriction
    function removePayment(address receiver, uint256 orderId) public {
        removePendingPayment(receiver, orderId); 
    }
    
    //TODO: security restriction
    function refundPayment(address receiver, uint256 orderId) public /*onlyRole(REFUNDER_ROLE)*/ {
        PaymentRecord storage payment = getPendingPayment(receiver, orderId); 
        
        //throw if order invalid 
        if (payment.payer == address(0)) {
            revert InvalidOrderId(orderId);
        }
        
        if (payment.amount > 0) {
            payment.refunded = true;
            removePendingPayment(receiver, orderId); 
        }
    }
    
    //TODO: security restriction, replace with approveBatch
    function approvePayments(address receiver) public {
        approvePendingBucket(receiver);
    }
    
    //TODO: security restriction, replace with processBatch
    function processPayments(address receiver) public {
        processApprovedBucket(receiver);
    }
}