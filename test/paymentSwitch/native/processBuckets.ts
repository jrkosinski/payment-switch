import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityContext,
    deployPaymentSwitchNative,
    deployMasterSwitch
} from "../../utils";
import { PaymentSwitchNative, MasterSwitch, SecurityContext } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import { Addressable } from "ethers";
import { bucketStates } from "../../constants";
import { IPayment } from "../../utils/IPayment";
import { PaymentUtil } from "../../utils/PaymentUtil";


describe("PaymentSwitch Native: Process Buckets", function () {
    let paymentSwitch: PaymentSwitchNative;
    let masterSwitch: MasterSwitch;
    let securityContext: SecurityContext;
    let _paymentId: number = 1;
    let paymentUtil: PaymentUtil;
    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts([
            'admin', 'approver', 'dao', 'system',
            'seller1', 'seller2', 'seller3', 'buyer1', 'buyer2', 'buyer3'
        ]);
        addresses = acc.addresses;
        accounts = acc.accounts;
        securityContext = await deploySecurityContext(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityContext, addresses);
        masterSwitch = await deployMasterSwitch(securityContext.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);
        paymentUtil = new PaymentUtil(paymentSwitch); 
    });

    describe("Happy Paths", function () {
        it("move pending payments to ready", async function () {
            
            //initial values
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);

            //place a bunch of payments 
            const ids: number[] = await paymentUtil.placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [accounts.buyer1, accounts.buyer2, accounts.buyer3, accounts.buyer3],
                [1000, 4000, 3000, 2000]
            ); 

            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(10000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(5000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(3000);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(2000);

            //move pending to ready for seller 1
            await paymentSwitch.freezePending(addresses.seller1);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.READY))).to.equal(5000);

            const payment1 = await paymentUtil.getPayment(ids[0]);
            const payment2 = await paymentUtil.getPayment(ids[1]);
            const payment3 = await paymentUtil.getPayment(ids[2]);
            const payment4 = await paymentUtil.getPayment(ids[3]);
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
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller1, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller2, bucketStates.PENDING))).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(addresses.seller3, bucketStates.PENDING))).to.equal(0);

            //place a bunch of payments 
            const ids: number[] = await paymentUtil.placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [accounts.buyer1, accounts.buyer2, accounts.buyer3, accounts.buyer3],
                [1000, 4000, 3000, 2000]
            );

            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(10000);
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

        it("create multiple approved buckets for multiple sellers", async function () {
            //place a bunch of payments for multiple sellers
            const ids: number[] = await paymentUtil.placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [accounts.buyer1, accounts.buyer2, accounts.buyer3, accounts.buyer3],
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
            const ids2: number[] = await paymentUtil.placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [accounts.buyer1, accounts.buyer2, accounts.buyer3, accounts.buyer3],
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
            //place a bunch of payments 
            const ids: number[] = await paymentUtil.placePayments(
                [addresses.seller1, addresses.seller1, addresses.seller2, addresses.seller3],
                [accounts.buyer1, accounts.buyer2, accounts.buyer3, accounts.buyer3],
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

            //should be 0 processed buckets, one approved bucket
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller1, bucketStates.APPROVED))).to.equal(1);
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller1, bucketStates.PROCESSED))).to.equal(0);
            
            //process one approved bucket
            await paymentSwitch.processPayments(addresses.seller1); 
            
            //should be 0 approved buckets, one processed bucket
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller1, bucketStates.APPROVED))).to.equal(0);
            expect(parseInt(await paymentSwitch.getBucketCountWithState(addresses.seller1, bucketStates.PROCESSED))).to.equal(1);
            
            //check the payout amounts 
            const expectedAmt = 5000;
            const feeBps = parseInt((await masterSwitch.feeBps()).toString());
            const feeAmt = (feeBps/10000) * expectedAmt;
            const vaultAddr = await masterSwitch.vaultAddress();
            expect(parseInt((await paymentSwitch.getAmountToPayOut(addresses.seller1)).toString())).to.equal(5000 - feeAmt);
            expect(parseInt((await paymentSwitch.getAmountToPayOut(addresses.seller2)).toString())).to.equal(0);
            expect(parseInt((await paymentSwitch.getAmountToPayOut(addresses.seller3)).toString())).to.equal(0);
            expect(parseInt((await paymentSwitch.getAmountToPayOut(vaultAddr)).toString())).to.equal(feeAmt); 
        });

        it("process multiple approved buckets", async function () {
            //TODO: (TEST) implement
        });
    });

    describe("Troubled Paths", function () {
        //TODO: (TEST) implement
    });

    describe("Events", function () {
        //TODO: (TEST) implement
    });
});
