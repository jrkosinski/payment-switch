import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchNative,
    getBalanceAsNumber,
    deployMasterSwitch,
    createOrderId
} from "../../utils";
import { PaymentSwitchNative, MasterSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import * as constants from "../../constants";
import { IPaymentRecord } from "test/IPaymentRecord";


describe("PaymentSwitch: Push Payments", function () {
    let paymentSwitch: PaymentSwitchNative;
    let masterSwitch: MasterSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system', 'payer', 'seller']);
        addresses = acc.addresses;
        accounts = acc.accounts;
        securityManager = await deploySecurityManager(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Push Payments", function () {
        it("push a simple successful payment", async function () {
            const orderId: number = createOrderId();
            const amount: number = 1000000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);
            expect(parseInt(paymentRecord.orderId)).to.equal(0);

            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            //make the payment 
            await paymentSwitch.placePayment(seller, paymentData, { value: amount });

            //initial values 
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            
            //check seller initial balance
            let sellerBalance = await getBalanceAsNumber(seller);
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(amount);

            //approve the payment 
            await paymentSwitch.pendingToReady(seller);
            await paymentSwitch.approvePayments(seller);

            //TODO: shouldn't fail 
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            //expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.approved);
            
            //TODO: test processing payments separately 
            await paymentSwitch.connect(accounts.dao).processPayments(seller);

            //push the payment 
            await paymentSwitch.connect(accounts.dao).pushPayment(seller); 
            
            //ensure that the funds have moved
            sellerBalance = (sellerBalance + amount) - (amount * 0.01); //TODO: get fee bps dynamically
            expect(await getBalanceAsNumber(seller)).to.equal(sellerBalance);

            //fee has not been pushed out to vault yet 
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(amount * 0.01);
        });
    });
});