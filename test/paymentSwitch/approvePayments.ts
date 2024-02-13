import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch, 
    deployMasterSwitch
} from "../utils";
import { MasterSwitch, PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../utils/security";
import { IPaymentRecord } from "../IPaymentRecord"; 
import * as constants from "../constants";


describe("PaymentSwitch: Approve Payments", function () {
    let paymentSwitch: PaymentSwitch;
    let masterSwitch: MasterSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        paymentSwitch = await deployPaymentSwitch(masterSwitch.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Approve Payments", function () {
        it("approve a simple successful payment", async function () {
            const orderId: number = 1109938;
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //TODO: make sure that no payment record exists already
            //paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            //expect(parseInt(paymentRecord.amount)).to.equal(0);

            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            await paymentSwitch.placePayment(seller, paymentData, { value: amount }); 
            
            //initial values 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(await paymentSwitch.getAmountOwed(seller))).to.equal(0);
            
            //approve the payment 
            await paymentSwitch.approvePayments(seller);

            //payment should be approved
            //TODO: this call should not fail; debug
            
            //pending record should be gone now
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);
            expect(parseInt(paymentRecord.orderId)).to.equal(0);
            
            //approved payments should be in the holding pot 
            expect(parseInt(await paymentSwitch.getAmountOwed(seller))).to.equal(amount);
        });
    });
});