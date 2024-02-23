import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    getBalanceAsNumber
} from "../utils";
import { TestPaymentBook } from "typechain";
import { convertPendingBucket } from "../utils";
import * as constants from "../constants";


describe("PaymentBook: General", function () {
    let paymentBook: TestPaymentBook;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'receiver1', 'receiver2', 'receiver3', 'payer1', 'payer2', 'payer3']);
        addresses = acc.addresses;
        
        //deploy test payment book 
        const accounts = await ethers.getSigners();
        const factory: any = (await ethers.getContractFactory(
            "TestPaymentBook",
            accounts[0]
        ));
        
        paymentBook = (await factory.deploy());
    });
    
    const orderIds: any = {};
    
    function randomOrderId() {
        let oid = 0; 
        while (oid == 0 || orderIds[oid]) {
            oid = Math.floor(Math.random() * 100000000); 
        }
        orderIds[oid] = true;
        return oid;
    }

    describe("Add Payments", function () {
        it("add a single payment", async function () {
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);
            
            const oid = randomOrderId();
            const amount = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer1, amount
            );

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount);

            const pendingBucket = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket.total).to.equal(amount);
            expect(pendingBucket.payments.length).to.equal(1);
            expect(pendingBucket.payments[0].payer).to.equal(addresses.payer1);
            expect(pendingBucket.payments[0].amount).to.equal(amount);
            expect(pendingBucket.payments[0].orderId).to.equal(oid);
            expect(pendingBucket.payments[0].refunded).to.be.false;
        });
        
        it("add multiple payments for the same receiver", async function () {
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);
            
            const oid1 = randomOrderId();
            const amount1 = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid1, addresses.payer1, amount1
            );

            const oid2 = randomOrderId();
            const amount2 = 200;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid2, addresses.payer2, amount2
            );

            const oid3 = randomOrderId();
            const amount3 = 300;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid3, addresses.payer3, amount3
            ); 
            
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2 + amount3);

            const pendingBucket = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket.total).to.equal(amount1 + amount2 + amount3);
            expect(pendingBucket.payments.length).to.equal(3);
            expect(pendingBucket.payments[0].orderId).to.equal(oid1);
            expect(pendingBucket.payments[1].orderId).to.equal(oid2);
            expect(pendingBucket.payments[2].orderId).to.equal(oid3);
            expect(pendingBucket.payments[0].payer).to.equal(addresses.payer1);
            expect(pendingBucket.payments[1].payer).to.equal(addresses.payer2);
            expect(pendingBucket.payments[2].payer).to.equal(addresses.payer3);
            expect(pendingBucket.payments[0].amount).to.equal(amount1);
            expect(pendingBucket.payments[1].amount).to.equal(amount2);
            expect(pendingBucket.payments[2].amount).to.equal(amount3);
        });

        it("add multiple payments for different receivers", async function () {
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver2))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver2))).to.equal(0);
            
            const oid1 = randomOrderId();
            const amount1 = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid1, addresses.payer1, amount1
            );

            const oid2 = randomOrderId();
            const amount2 = 200;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid2, addresses.payer2, amount2
            );

            const oid3 = randomOrderId();
            const amount3 = 300;
            await paymentBook.addPendingPayment(
                addresses.receiver2, oid3, addresses.payer3, amount3
            );

            const oid4 = randomOrderId();
            const amount4 = 400;
            await paymentBook.addPendingPayment(
                addresses.receiver2, oid4, addresses.payer2, amount4
            );

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver2))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver2))).to.equal(amount3 + amount4);

            //payments for first receiver 
            const pendingBucket1 = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket1.total).to.equal(amount1 + amount2);
            expect(pendingBucket1.payments.length).to.equal(2);
            expect(pendingBucket1.payments[0].orderId).to.equal(oid1);
            expect(pendingBucket1.payments[1].orderId).to.equal(oid2);
            expect(pendingBucket1.payments[0].payer).to.equal(addresses.payer1);
            expect(pendingBucket1.payments[1].payer).to.equal(addresses.payer2);
            expect(pendingBucket1.payments[0].amount).to.equal(amount1);
            expect(pendingBucket1.payments[1].amount).to.equal(amount2);

            //payments for second receiver 
            const pendingBucket2 = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver2));
            expect(pendingBucket2.total).to.equal(amount3 + amount4);
            expect(pendingBucket2.payments.length).to.equal(2);
            expect(pendingBucket2.payments[0].orderId).to.equal(oid3);
            expect(pendingBucket2.payments[1].orderId).to.equal(oid4);
            expect(pendingBucket2.payments[0].payer).to.equal(addresses.payer3);
            expect(pendingBucket2.payments[1].payer).to.equal(addresses.payer2);
            expect(pendingBucket2.payments[0].amount).to.equal(amount3);
            expect(pendingBucket2.payments[1].amount).to.equal(amount4);
        });
        
        it("add and remove a payment", async function () {
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);

            const oid1 = randomOrderId();
            const amount1 = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid1, addresses.payer1, amount1
            );

            const oid2 = randomOrderId();
            const amount2 = 200;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid2, addresses.payer2, amount2
            );

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);

            const pendingBucket1 = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket1.payments.length).to.equal(2);
            expect(pendingBucket1.total).to.equal(amount1 + amount2);
            
            //remove payment 1
            await paymentBook.removePendingPayment(oid1);

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount2);

            //check that the payment is removed 
            const pendingBucket2 = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket2.total).to.equal(amount2);
            expect(pendingBucket2.payments[0].orderId).to.equal(0);
            expect(pendingBucket2.payments[0].amount).to.equal(0);
            expect(pendingBucket2.payments[1].orderId).to.equal(oid2);
            expect(pendingBucket2.payments[1].amount).to.equal(amount2);
            
            //remove payment 2
            await paymentBook.removePendingPayment(oid2);

            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);

            const pendingBucket3 = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket3.total).to.equal(0);
            expect(pendingBucket3.payments[0].orderId).to.equal(0);
            expect(pendingBucket3.payments[0].amount).to.equal(0);
            expect(pendingBucket3.payments[0].refunded).to.be.false;
            expect(pendingBucket3.payments[1].orderId).to.equal(0);
            expect(pendingBucket3.payments[1].amount).to.equal(0);
            expect(pendingBucket3.payments[1].refunded).to.be.false;
        });
        
        it("add to an existing payment from the original buyer", async function () {
            const oid = randomOrderId();
            const amount1 = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer1, amount1
            );

            const amount2 = 200;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer1, amount2
            );
            
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);

            const pendingBucket = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket.total).to.equal(amount1 + amount2);
            expect(pendingBucket.payments.length).to.equal(1);
            expect(pendingBucket.payments[0].orderId).to.equal(oid);
            expect(pendingBucket.payments[0].payer).to.equal(addresses.payer1);
            expect(pendingBucket.payments[0].amount).to.equal(amount1 + amount2);
        });

        it("add to an existing payment from a different buyer", async function () {
            const oid = randomOrderId();
            const amount1 = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer1, amount1
            );

            const amount2 = 200;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer2, amount2
            );

            const pendingPayment = await paymentBook.getPendingPayments(addresses.receiver1);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);

            //TODO: the second one is from a different buyer, so maybe the buyer should be added, or?
            const pendingBucket = convertPendingBucket(await paymentBook.getPendingPayments(addresses.receiver1));
            expect(pendingBucket.total).to.equal(amount1 + amount2);
            expect(pendingBucket.payments.length).to.equal(1);
            expect(pendingBucket.payments[0].orderId).to.equal(oid);
            expect(pendingBucket.payments[0].payer).to.equal(addresses.payer1);
            expect(pendingBucket.payments[0].amount).to.equal(amount1 + amount2);
        });
    });

    describe("Approve Payments", function () {
        it("approve payments for a single receiver", async function () {

            //add a payment 
            const oid1 = randomOrderId();
            const amount1 = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid1, addresses.payer1, amount1
            );

            //add a payment 
            const oid2 = randomOrderId();
            const amount2 = 200;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid2, addresses.payer2, amount2
            );
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);

            //approve the receiver's pending transactions
            await paymentBook.makeReadyBucket(addresses.receiver1);
            await paymentBook.approveReadyBucket(addresses.receiver1);
            expect(parseInt(await paymentBook.getAmountApproved(addresses.receiver1))).to.equal(amount1 + amount2);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);
            
            //TODO: assert on approved payments
        });

        it("approve payments for multiple receivers", async function () {
            //TODO: implement
        });
    });

    describe("Process Payments", function () {
        it("process payments for a single receiver", async function () {
            //TODO: implement
        });

        it("process payments for multiple receivers", async function () {
            //TODO: implement
        });
    });
});