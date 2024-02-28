import { expect } from "chai";
import {
    getTestAccounts,
    deployTestPaymentBook_Move
} from "../utils";
import { TestPaymentBook_Move } from "typechain";
import { ethers } from "hardhat";


describe("PaymentBook: Move Payments", function () {
    let paymentBook: TestPaymentBook_Move;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'payer']);
        addresses = acc.addresses;
        paymentBook = await deployTestPaymentBook_Move();
    });
    
    describe("Remove Payments", function () {
        it("can remove payment from pending", async() => {
            await paymentBook.test_can_remove_payment_from_pending(addresses.payer);
        });

        it("can remove payment from review", async () => {
            await paymentBook.test_can_remove_payment_from_review(addresses.payer);
        });
    });

    describe("Move Payments", function () {
        it("can move payment from pending to review", async () => {
            await paymentBook.test_can_move_from_pending_to_review(addresses.payer);
        });

        it("can move payment from review to pending", async () => {
            await paymentBook.test_can_move_from_review_to_pending(addresses.payer);
        });
    });
});