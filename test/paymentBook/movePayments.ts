import { expect } from "chai";
import {
    getTestAccounts,
    deployTestPaymentBook
} from "../utils";
import { TestPaymentBook } from "typechain";
import { ethers } from "hardhat";


describe("PaymentBook: Move Payments", function () {
    let paymentBook: TestPaymentBook;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin']);
        paymentBook = await deployTestPaymentBook();
    });
});