// SPDX-License-Identifier: UNLICENSED
import "./ManagedSecurity.sol"; 
import "./utils/CarefulMath.sol"; 

//TODO: add security restrictions 
//TODO: multi-payment orders 
//TODO: order batches for approval 

contract PaymentSwitch is ManagedSecurity
{
    uint256 public feeBps; 
    address public vaultAddress;
    
    //TODO: 1 order id per payment for now, maybe later it will be changed one->many
    mapping (uint256 => PaymentRecord) payments;
    
    //this is the pot where approved funds are stored before sending out 
    mapping (address => uint256) approvedFunds;
    
    //events 
    event PaymentPlaced (
        address indexed payer, 
        address indexed receiver, 
        uint256 amount
    );
    event PaymentApproved (
        address indexed approver, 
        uint256 indexed orderId, 
        uint256 amount,
        uint256 fee
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
    error DuplicateOrderId(uint256 orderId);
    error InvalidOrderId(uint256 orderId);
    error PaymentAmountMismatch(uint256 amount1, uint256 amount2);
    
    //enums
    uint8 private constant STATE_PLACED = 1;
    uint8 private constant STATE_APPROVED = 2;
    
    struct PaymentRecord {
        uint256 amount;
        address payer; 
        address receiver;
        uint8 state;
    }
    
    constructor(ISecurityManager securityManager, address vault, uint256 _feeBps) {
        _setSecurityManager(securityManager);
        setVaultAddress(vault);
        setFeeBps(_feeBps);
    }
    
    //TODO: add restrictions
    function setFeeBps(uint256 _feeBps) public payable {
        feeBps = _feeBps;
        emit FeeBpsChanged(_feeBps, msg.sender); //TODO: test
    }

    //TODO: add restrictions
    function setVaultAddress(address _vaultAddress) public payable {
        vaultAddress = _vaultAddress;
        emit VaultAddressChanged(_vaultAddress, msg.sender); //TODO: test
    }
    
    //TODO: add restrictions
    function placePayment(uint256 orderId, PaymentRecord calldata payment) external payable {
        //check that the amount is correct
        if (payment.amount != msg.value)
            revert PaymentAmountMismatch(payment.amount, msg.value);
        
        //throw error on duplicate
        if (payments[orderId].amount != 0) 
            revert DuplicateOrderId(orderId);
            
        payments[orderId] = payment;
        
        //not approved by default 
        payments[orderId].state = STATE_PLACED;
        
        //event 
        emit PaymentPlaced(
            payment.payer, 
            payment.receiver, 
            payment.amount
        );
    }
    
    //TODO: add restrictions
    function approvePayment(uint256 orderId) external {
        PaymentRecord storage payment = payments[orderId]; 
        
        //TODO: error if invalid order id
        if (payment.amount <= 0 || payment.state == 0) {
            revert InvalidOrderId(orderId);
        }
        
        //set state to approved
        payment.state = STATE_APPROVED;
        
        //calculate fee from payment
        uint256 fee = 0;
        
        if (vaultAddress != address(0)) {
            fee = CarefulMath.div(payment.amount, feeBps); 
            if (fee > payment.amount)
                fee = 0;
        }
        
        approvedFunds[payment.receiver] += payment.amount - fee;
        
        if (fee > 0) 
            approvedFunds[vaultAddress] += fee;  //TODO: test
        
        //emit event 
        emit PaymentApproved(
            msg.sender, 
            orderId, 
            payment.amount, 
            fee
        );   //TODO: test
    }
    
    //TODO: add restrictions
    function pushPayment(address payable receiver) external {
        _sendPayment(receiver);
    }
    
    function pullPayment() external {
        _sendPayment(payable(msg.sender));
    }
    
    function getPayment(uint256 orderId) external view returns (PaymentRecord memory) {
        return payments[orderId];
    }
    
    function getApprovedFunds(address receiver) external view returns (uint256) {
        return approvedFunds[receiver];
    }
    
    //TODO: protect against reentrancy
    function _sendPayment(address payable receiver) internal {
        uint256 amount = approvedFunds[receiver]; 
         
        if (amount > 0) {
            
            //zero out the approved funds pot
            approvedFunds[receiver] = 0;
            
            //transfer 
            receiver.transfer(amount);
            (bool success,) = receiver.call{value: msg.value}("");
            
            if (!success)
                revert("failed payment"); //TODO: custom error
            //TODO: test failed payment
            
            //emit event 
            emit PaymentSent(receiver, amount, success); //TODO: test
        }
    }
}