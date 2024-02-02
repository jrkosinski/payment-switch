import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch
} from "./utils";
import { PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "./utils/security";
import * as constants from "./constants";


describe("PaymentSwitch: Approve Payments", function () {
    let switcher: PaymentSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'multisig', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        switcher = await deployPaymentSwitch(securityManager.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Approve Payments", function () {
        it("approve a simple successful payment", async function () {
            const orderId: number = 1109938;
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            paymentRecord = await switcher.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            //TODO: can be its own type 
            const paymentData: any = {
                amount, payer, orderId: orderId, refunded: false
            };

            await switcher.placePayment(seller, paymentData, { value: amount }); 
            
            //initial values 
            paymentRecord = await switcher.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(await switcher.getAmountOwed(seller))).to.equal(0);
            
            //approve the payment 
            await switcher.approvePayments(seller);

            //payment should be approved
            //TODO: this call should not fail; debug
            //paymentRecord = await switcher.getPendingPayment(seller, orderId.toString());
            //expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.approved);
            
            //approved payments should be in the holding pot 
            expect(parseInt(await switcher.getAmountOwed(seller))).to.equal(amount);
        });
    });
});