import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchToken, 
    getTokenBalanceAsNumber,
    deployMasterSwitch,
    deployTestToken,
    createOrderId
} from "../../utils";
import { MasterSwitch, PaymentSwitchToken, SecurityManager, TestToken } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import * as constants from "../../constants";
import { IPaymentRecord } from "test/IPaymentRecord";


describe("PaymentSwitch Token: Place Payments", function () {
    let masterSwitch: MasterSwitch;
    let paymentSwitch: PaymentSwitchToken;
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

    describe("Make Payments", function () {
        it("make and record a simple successful payment", async function () {
            const orderId: number = createOrderId(); 
            const amount: number = 100000000; 
            const { payer, seller } = addresses;
            let paymentRecord: any = null;
            
            //initial values
            expect(await getTokenBalanceAsNumber(token.target, paymentSwitch.target)).to.equal(0);

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);
             
            //place a payment 
            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };
            
            await token.approve(paymentSwitch.target.toString(), amount);
            await paymentSwitch.placePayment(addresses.seller, paymentData); 

            //check that amount is recorded 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(paymentRecord.refunded).to.equal(false);
            
            //check that ether amount is stored 
            expect(await getTokenBalanceAsNumber(token.target, paymentSwitch.target)).to.equal(amount);
        });
    });
});