import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityContext,
    deployPaymentSwitchToken,
    deployMasterSwitch, 
    deployTestToken
} from "../../utils";
import { PaymentSwitchToken, TestToken, MasterSwitch, SecurityContext } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import { Addressable } from "ethers";
import { bucketStates } from "../../constants";
import { IPayment } from "../../utils/IPayment";


describe("PaymentSwitch Token: Process Buckets", function () {
    let paymentSwitch: PaymentSwitchToken;
    let masterSwitch: MasterSwitch;
    let securityContext: SecurityContext;
    let token: TestToken;
    let _paymentId: number = 1;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts([
            'admin', 'approver', 'dao', 'system',
            'seller1', 'seller2', 'seller3', 'buyer1', 'buyer2', 'buyer3'
        ]);
        addresses = acc.addresses;
        securityContext = await deploySecurityContext(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityContext, addresses);
        token = await deployTestToken();
        await token.mintToCaller(1000000000);
        masterSwitch = await deployMasterSwitch(securityContext.target);
        paymentSwitch = await deployPaymentSwitchToken(masterSwitch.target, token.target);
    });

    //TODO: (HIGH) standardize these functions 
    async function placeNewPayment(
        seller: string | Addressable,
        buyer: string | Addressable,
        amount: number
    ): Promise<number> {
        await token.approve(paymentSwitch.target.toString(), amount);
        await paymentSwitch.placePayment(seller.toString(), { id: _paymentId++, payer: buyer.toString(), amount, refundAmount: 0 });
        return _paymentId - 1;
    }

    async function placePayments(
        sellers: string[] | Addressable[],
        buyers: string[] | Addressable[],
        amounts: number[]
    ): Promise<number[]> {
        const output: number[] = [];
        for (let n = 0; n < sellers.length; n++) {
            output.push(await placeNewPayment(sellers[n], buyers[n], amounts[n]));
        }

        return output;
    }

    async function addToExistingPayment(
        id: number,
        seller: string | Addressable,
        buyer: string | Addressable,
        amount: number
    ): Promise<void> {
        await token.approve(paymentSwitch.target.toString(), amount);
        await paymentSwitch.placePayment(seller.toString(), { id, payer: buyer.toString(), amount, refundAmount: 0 });
    }

    async function getPayment(paymentId: number): Promise<IPayment> {
        const result = await paymentSwitch.getPaymentById(paymentId);
        const payment = {
            id: parseInt(result[0]),
            payer: result[1],
            amount: parseInt(result[2]),
            refundAmount: parseInt(result[3]),
            state: parseInt(result[4].toString())
        }
        return payment;
    }

    async function getBalance(address: string | Addressable): Promise<number> {
        return parseInt((await token.balanceOf(address.toString())).toString());
    }

    describe("Happy Paths", function () {
        it("move pending payments to ready", async function () {

            //initial values
            expect(await getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);

            //place a bunch of payments 
            const ids: number[] = await placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [addresses.buyer1, addresses.buyer2, addresses.buyer3, addresses.buyer3],
                [1000, 4000, 3000, 2000]
            );

            expect(await getBalance(paymentSwitch.target)).to.equal(10000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(5000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(3000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(2000);

            //move pending to ready for seller 1
            await paymentSwitch.freezePending(addresses.seller1);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.READY))).to.equal(5000);

            const payment1 = await getPayment(ids[0]);
            const payment2 = await getPayment(ids[1]);
            const payment3 = await getPayment(ids[2]);
            const payment4 = await getPayment(ids[3]);
            expect(payment1.state).to.equal(bucketStates.READY);
            expect(payment2.state).to.equal(bucketStates.READY);
            expect(payment3.state).to.equal(bucketStates.PENDING);
            expect(payment4.state).to.equal(bucketStates.PENDING);

            //move pending to ready for seller 2
            await paymentSwitch.freezePending(addresses.seller2);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.READY))).to.equal(3000);

            //move pending to ready for seller 3
            await paymentSwitch.freezePending(addresses.seller3);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.READY))).to.equal(2000);
        });

        it("approve a ready bucket", async function () {
            //initial values
            expect(await getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);

            //place a bunch of payments 
            const ids: number[] = await placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [addresses.buyer1, addresses.buyer2, addresses.buyer3, addresses.buyer3],
                [1000, 4000, 3000, 2000]
            );

            expect(await getBalance(paymentSwitch.target)).to.equal(10000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(5000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(3000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(2000);

            //move all to ready bucket
            await Promise.all([
                paymentSwitch.freezePending(addresses.seller1),
                paymentSwitch.freezePending(addresses.seller2),
                paymentSwitch.freezePending(addresses.seller3)
            ]);

            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.READY))).to.equal(5000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.READY))).to.equal(3000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.READY))).to.equal(2000);

            //approve ready bucket 
            await paymentSwitch.approvePayments(addresses.seller1);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.READY))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.APPROVED))).to.equal(5000);
        });

        it("create multiple approved buckets", async function () {
            //place a bunch of payments 
            const ids: number[] = await placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [addresses.buyer1, addresses.buyer2, addresses.buyer3, addresses.buyer3],
                [1000, 4000, 3000, 2000]
            );

            //move all to ready bucket
            await Promise.all([
                paymentSwitch.freezePending(addresses.seller1),
                paymentSwitch.freezePending(addresses.seller2),
                paymentSwitch.freezePending(addresses.seller3)
            ]);

            //approve all ready buckets
            await Promise.all([
                paymentSwitch.approvePayments(addresses.seller1),
                paymentSwitch.approvePayments(addresses.seller2),
                paymentSwitch.approvePayments(addresses.seller3)
            ]);

            //place a bunch of payments 
            const ids2: number[] = await placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [addresses.buyer1, addresses.buyer2, addresses.buyer3, addresses.buyer3],
                [1000, 4000, 3000, 2000]
            );

            //move all to ready bucket
            await Promise.all([
                paymentSwitch.freezePending(addresses.seller1),
                paymentSwitch.freezePending(addresses.seller2),
                paymentSwitch.freezePending(addresses.seller3)
            ]);

            //approve all ready buckets
            await Promise.all([
                paymentSwitch.approvePayments(addresses.seller1),
                paymentSwitch.approvePayments(addresses.seller2),
                paymentSwitch.approvePayments(addresses.seller3)
            ]);

            //approved buckets counts should be > 1 for each seller 
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller1, bucketStates.APPROVED))).to.equal(2);
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller2, bucketStates.APPROVED))).to.equal(2);
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller3, bucketStates.APPROVED))).to.equal(2);

            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller1, bucketStates.READY))).to.equal(0);
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller2, bucketStates.READY))).to.equal(0);
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller3, bucketStates.READY))).to.equal(0);

            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);

            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.READY))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.READY))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.READY))).to.equal(0);

            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.APPROVED))).to.equal(10000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.APPROVED))).to.equal(6000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.APPROVED))).to.equal(4000);
        });

        it("process an approved bucket", async function () {
        });

        it("process multiple approved buckets", async function () {
        });
    });

    describe("Troubled Paths", function () {
    });
});
