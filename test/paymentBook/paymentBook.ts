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
        let acc = await getTestAccounts(['admin', 'receiver1', 'receiver2', 'payer1', 'payer2']);
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
        it("add multiple payments for the same receiver", async function () {
            const oid = randomOrderId();
            const amount = 100;
            await paymentBook.addPendingPayment(
                addresses.receiver1, oid, addresses.payer1, amount
            ); 
        });

        it("add multiple payments for different receivers", async function () {
        });
        
        it("add and remove a payment", async function () {
        });
    });

    describe("Refund Payments", function () {
        it("refund a pending payment", async function () {
        });

        it("approve remaining payments after refunding payments", async function () {
        });

        it("attempt to refund payments that have been approved", async function () {
        });
    });

    describe("Approve Payments", function () {
        it("approve payments for a single receiver", async function () {
        });

        it("approve payments for multiple receivers", async function () {
        });
    });

    describe("Process Payments", function () {
        it("process payments for a single receiver", async function () {
        });

        it("process payments for multiple receivers", async function () {
        });
    });
});