import { expect } from "chai";
import {
    getTestAccounts,
    deployTestPaymentBook
} from "../utils";
import { TestPaymentBook } from "typechain";
import { ethers } from "hardhat";


describe("PaymentBook: Add Payments", function () {
    let paymentBook: TestPaymentBook;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'buyer']);
        addresses = acc.addresses;
        paymentBook = await deployTestPaymentBook();
    });
    
    /*
    - add payment to pending bucket 
    - add nw pending bucket 
    - see payment in ready bucket 
    - approve ready bucket 
    - see payment in approved bucket 
    - add new pending bucket 
    - see payment in approved bucket 
    */
   
    it("adding payment causes automatic adding of buckets, when bucket count is zero", async () => {
        await paymentBook.test_addPayments_zero_buckets(addresses.buyer);
    });

    it("can add payment to pending bucket", async () => {
        await paymentBook.test_addPayments_pending_bucket(addresses.buyer);
    });

    it("can add payment to ready bucket", async () => {
        await paymentBook.test_addPayments_can_add_to_ready(addresses.buyer);
    });

    it("can add payment to review bucket", async () => {
        await paymentBook.test_addPayments_can_add_to_review(addresses.buyer);
    });
    
    //TODO: add $ to existing payments in various buckets 
    //TODO: add $ to existing payments in buckets fails for wrong bucket states
});