import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deployTestPaymentBook,
    expectRevert
} from "../utils";
import { TestPaymentBook } from "typechain";
import { bucketStates } from "../constants";


describe("PaymentBook: Add Buckets", function () {
    let paymentBook: TestPaymentBook;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin']);
        addresses = acc.addresses;
        paymentBook = await deployTestPaymentBook();
    });
    
    /*
    Pass indices as: [review, processed, approved, ready, pending]
    */
    async function testBucketStateIndices(indices: number[]) {
        const results = await Promise.all([
            paymentBook.getBucketIndexWithState(addresses.admin, bucketStates.REVIEW),
            paymentBook.getBucketIndexWithState(addresses.admin, bucketStates.PROCESSED),
            paymentBook.getBucketIndexWithState(addresses.admin, bucketStates.APPROVED),
            paymentBook.getBucketIndexWithState(addresses.admin, bucketStates.READY),
            paymentBook.getBucketIndexWithState(addresses.admin, bucketStates.PENDING),
        ]);
        
        for(let n=0; n<Math.min(indices.length, results.length); n++) {
            expect (indices[n]).to.equal(parseInt(results[n]));
        }
    }

    /**  
     * This tests that the bucket sequence is always correct and the bucket states do not 
     * become inconsistent as new buckets are added for a given receiver. 
     * 
     * KEY: 
     * [RV] = review bucket 
     * [P] = processed bucket 
     * [A] = approved bucket 
     * [R] = ready bucket 
     * [P] = pending bucket 
    */
    describe("State Transitions", function () {
        /**
         * Start with zero buckets, add a bucket; should result in one pending bucket, and one
         * review bucket.
         * [] => [RV][P]
        */
        it("from zero buckets to two", async function () {
            await paymentBook.test_stateTransitions0();
            await testBucketStateIndices([1, 0, 0, 0, 2]);
        });

        /**
         * Start with a pending bucket and a review bucket, add a bucket; should result in 
         * one pending, one ready, and one review. 
         * [RV][P] => [RV][R][P]
        */
        it("from two buckets to three", async function () {
            await paymentBook.test_stateTransitions1();
            await testBucketStateIndices([1, 0, 0, 2, 3]);
        });

        /**
         * Start with a pending, review, and ready, approve the ready and add another bucket; 
         * should result [RV][A][R][P]
         * [RV][R][P] => [RV][A][R][P]
        */
        it("from three buckets to four", async function () {
            await paymentBook.test_stateTransitions2();
            await testBucketStateIndices([1, 0, 2, 3, 4]);
        });

        /**
         * Start with a pending, review, and ready, approve the ready and add another bucket, 
         * then approve the ready bucket and add another bucket; should result [RV][A][A][R][P]
         * [RV][R][P] => [RV][A][R][P] => [RV][A][A][R][P]
        */
        it("from three buckets to five", async function () {
            await paymentBook.test_stateTransitions3();
            await testBucketStateIndices([1, 0, 3, 4, 5]);
        });

        /**
         * Attempting to add another ready bucket when one already exists, without approving 
         * the existing one first, will revert. 
        */
        it("can't add more than one ready bucket", async function() {
            await expectRevert(() => paymentBook.test_stateTransitions_wont_add_multple_pending());
        });
    });
});