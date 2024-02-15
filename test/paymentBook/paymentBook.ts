import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    getBalanceAsNumber
} from "../utils";
import { TestPaymentBook } from "typechain";
import { applySecurityRoles } from "../utils/security";
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
            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);
            
            const oid = randomOrderId();
            const amount = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer1, amount
            );

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount);
        });
        
        it("add multiple payments for the same receiver", async function () {
            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
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
            
            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2 + amount3);
        });

        it("add multiple payments for different receivers", async function () {
            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver2))).to.equal(0);
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

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver2))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver2))).to.equal(amount3 + amount4);
        });
        
        it("add and remove a payment", async function () {
            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
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

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount1 + amount2);
            
            //remove payment 1
            await paymentBook.removePendingPayment(addresses.receiver1, oid1);

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(amount2);

            //TODO: check that the payment is removed 
            
            //remove payment 2
            await paymentBook.removePendingPayment(addresses.receiver1, oid2);

            expect(parseInt(await paymentBook.getAmountOwed(addresses.receiver1))).to.equal(0);
            expect(parseInt(await paymentBook.getAmountPending(addresses.receiver1))).to.equal(0);

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
            
            //TODO: asserts
        });
    });

    //TODO: move these all to paymentSwitch tests, because refunding is not the responsibility of PaymentBook
    describe("Refund Payments", function () {
        it("fully refund a pending payment", async function () {
            
        });

        it("approve remaining payments after refunding payments", async function () {
            //TODO: implement
        });

        it("attempt to refund payments that have been approved", async function () {
            //TODO: implement
        });
        
        it("partial refund", async function () {
            //TODO: implement
        });
    });

    describe("Approve Payments", function () {
        it("approve payments for a single receiver", async function () {
            //TODO: implement
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