import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchToken, 
    deployMasterSwitch,
    createOrderId,
    deployTestToken
} from "../../utils";
import { MasterSwitch, PaymentSwitchToken, SecurityManager, TestToken } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import { IPaymentRecord } from "../../IPaymentRecord"; 
import * as constants from "../../constants";


describe("PaymentSwitch Token: Approve Payments", function () {
    let paymentSwitch: PaymentSwitchToken;
    let masterSwitch: MasterSwitch;
    let securityManager: SecurityManager;
    let token: TestToken;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        token = await deployTestToken();
        paymentSwitch = await deployPaymentSwitchToken(masterSwitch.target, token.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
        
        //mint token 
        await Promise.all([
            token.mintToCaller(800000000),
            token.mint(addresses.payer, 800000000)
        ]);
    });

    describe("Approve Payments", function () {
        it("approve a simple successful payment", async function () {
            const orderId: number = createOrderId();
            const amount: number = 10000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            //approve & pay
            await token.approve(paymentSwitch.target.toString(), paymentData.amount);
            await paymentSwitch.placePayment(seller, paymentData);
            
            //initial values 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(await paymentSwitch.getAmountApproved(seller))).to.equal(0);
            
            //approve the payment 
            await paymentSwitch.pendingToReady(seller);
            await paymentSwitch.approvePayments(seller);

            //payment should be approved
            //TODO: this call should not fail; debug
            
            //pending record should be gone now
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);
            expect(parseInt(paymentRecord.orderId)).to.equal(0);
            
            //approved payments should be in the holding pot 
            expect(parseInt(await paymentSwitch.getAmountApproved(seller))).to.equal(amount);
            
            //TODO: check token balances 
        });
    });
});