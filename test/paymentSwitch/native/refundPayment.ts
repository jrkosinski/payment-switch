import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchNative,
    getBalanceAsNumber,
    deployMasterSwitch, 
    placePayment,
    createOrderId
} from "../../utils";
import { MasterSwitch, PaymentSwitchNative, SecurityManager } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import * as constants from "../../constants";
import { IPaymentRecord } from "test/IPaymentRecord";


describe("PaymentSwitch: Refund Payments", function () {
    let masterSwitch: MasterSwitch;
    let paymentSwitch: PaymentSwitchNative;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Partial Refund", function () {
        it("make a partial refund of a payment", async function () {
            const orderId: number = createOrderId();
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //initial values
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(0);

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            //place a payment 
            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            await paymentSwitch.placePayment(addresses.seller, paymentData, { value: amount });

            //check that amount is recorded 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(paymentRecord.refunded).to.equal(false);

            //check that ether amount is stored 
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(amount);
            
            //refund a portion of the payment 
            const refundAmount: number = Math.floor(amount *.25);
            await paymentSwitch.refundPayment(addresses.seller, orderId, refundAmount);
            
            //check the payment record now
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(parseInt(paymentRecord.amount)).to.equal(amount - refundAmount);
            expect(paymentRecord.refunded).to.equal(false);
        });

        it("cannot refund more than the original amount", async function () {
            const orderId: number = createOrderId();
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //initial values
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(0);

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            //place a payment 
            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            await paymentSwitch.placePayment(addresses.seller, paymentData, { value: amount });

            //check that amount is recorded 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(paymentRecord.refunded).to.equal(false);

            //check that ether amount is stored 
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(amount);

            //refund a portion of the payment 
            const refundAmount: number = amount+1;
            await expect(paymentSwitch.refundPayment(addresses.seller, orderId, refundAmount)).to.be.reverted;
        });

        it("attempt to partially refund payments that have been approved", async function () {
            const orderId: number = createOrderId();
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            await paymentSwitch.placePayment(seller, paymentData, { value: amount });

            //initial values 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(await paymentSwitch.getAmountApproved(seller))).to.equal(0);

            //approve the payment 
            await paymentSwitch.pendingToReady(seller);
            await paymentSwitch.approvePayments(seller);

            //attempt to refund a portion of it 
            const refundAmount: number = Math.floor(amount / 2);
            await expect(paymentSwitch.refundPayment(addresses.seller, orderId, refundAmount)).to.be.reverted;
        });
    });
    
    //TODO: move these all to paymentSwitch tests, because refunding is not the responsibility of PaymentBook
    describe("Refund Payments", function () {
        it("fully refund a pending payment", async function () {
            const orderId: number = createOrderId();
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //initial values
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(0);

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            //place a payment 
            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            await paymentSwitch.placePayment(addresses.seller, paymentData, { value: amount });

            //check that amount is recorded 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(paymentRecord.refunded).to.equal(false);

            //check that ether amount is stored 
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(amount);

            //refund a portion of the payment 
            const refundAmount: number = amount;
            await paymentSwitch.refundPayment(addresses.seller, orderId, refundAmount);

            //check the payment record now
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(ethers.ZeroAddress);
            expect(parseInt(paymentRecord.orderId)).to.equal(0);
            expect(parseInt(paymentRecord.amount)).to.equal(0);
            expect(paymentRecord.refunded).to.equal(false);
        });

        it("attempt to fully refund payments that have been approved", async function () {
            const orderId: number = createOrderId();
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            //make sure that no payment record exists already
            paymentRecord = await paymentSwitch.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };

            await paymentSwitch.placePayment(seller, paymentData, { value: amount });

            //initial values 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(await paymentSwitch.getAmountApproved(seller))).to.equal(0);

            //approve the payment 
            await paymentSwitch.pendingToReady(seller);
            await paymentSwitch.approvePayments(seller);

            //attempt to refund a portion of it 
            const refundAmount: number = amount;
            await expect(paymentSwitch.refundPayment(addresses.seller, orderId, refundAmount)).to.be.reverted;
        });

        it.skip("approve remaining payments after refunding payments", async function () {
            //create several payments 
            const oid1 = createOrderId();
            await placePayment(paymentSwitch, addresses.seller, addresses.buyer, 100, oid1); 
        });
    });
});