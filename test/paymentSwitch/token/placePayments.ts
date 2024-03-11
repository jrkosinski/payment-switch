import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityContext,
    deployPaymentSwitchToken,
    deployTestToken,
    deployMasterSwitch,
    expectRevert,
    expectEvent,
    listenForEvent
} from "../../utils";
import { PaymentSwitchToken, TestToken, MasterSwitch, SecurityContext } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import { bucketStates } from "../../constants";
import { IPayment } from "../../utils/IPayment";
import { PaymentUtil } from "../../utils/PaymentUtil";
import * as constants from "../../constants";
import { Signer } from "ethers";


describe("PaymentSwitch Token: Place Payments", function () {
    let paymentSwitch: PaymentSwitchToken;
    let masterSwitch: MasterSwitch;
    let securityContext: SecurityContext;
    let token: TestToken;
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
        token = await deployTestToken();
        await token.mintToCaller(1000000000);
        await token.mint(addresses.buyer1, 1000000000);
        await token.mint(addresses.buyer2, 1000000000);
        masterSwitch = await deployMasterSwitch(securityContext.target);
        paymentSwitch = await deployPaymentSwitchToken(masterSwitch.target, token.target);
        paymentUtil = new PaymentUtil(paymentSwitch, token);
    });
    
    describe("Happy Paths", function () {
        it("place a payment", async function () {
            const amount: number = 1000;
            const receiver: string = addresses.seller1;

            //initial values
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(receiver, bucketStates.PENDING))).to.equal(0);

            //make payment
            const paymentId = await paymentUtil.placePayment(receiver, accounts.buyer1, amount);

            //payment now exists
            expect(await paymentSwitch.paymentExists(paymentId)).to.be.true;

            //check that amount is recorded 
            const payment: IPayment = await paymentUtil.getPayment(paymentId);
            expect(payment.payer).to.equal(addresses.buyer1);
            expect(payment.amount).to.equal(amount);
            expect(payment.id).to.equal(paymentId);
            expect(payment.refundAmount).to.equal(0);
            expect(payment.state).to.equal(bucketStates.PENDING);

            //check that ether amount is stored 
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(amount);
        });

        it("place multiple payments for same seller", async function () {
            const amounts: number[] = [100, 200, 300];
            const buyers: Signer[] = [accounts.buyer1, accounts.buyer2, accounts.buyer1];
            const paymentIds: number[] = [];
            const receiver: string = addresses.seller1;

            //initial values
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(receiver, bucketStates.PENDING))).to.equal(0);

            //make payments
            for (let n = 0; n < amounts.length; n++) {
                paymentIds.push(await paymentUtil.placePayment(receiver, buyers[n], amounts[n]));
            }
            
            //test results 
            for (let n = 0; n < paymentIds.length; n++) {
                expect(await paymentSwitch.paymentExists(paymentIds[n])).to.be.true;

                //check that amount is recorded 
                const payment: IPayment = await paymentUtil.getPayment(paymentIds[n]);
                expect(payment.payer).to.equal(await buyers[n].getAddress());
                expect(payment.amount).to.equal(amounts[n]);
                expect(payment.id).to.equal(paymentIds[n]);
                expect(payment.refundAmount).to.equal(0);
                expect(payment.state).to.equal(bucketStates.PENDING);
            }

            //check that ether amount is stored 
            const expectedSum: number = amounts.reduce((a, n) => { return a + n }, 0);
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(expectedSum);
        });

        it("add to an existing payment", async function () {
            const amount: number = 1000;
            const receiver: string = addresses.seller1;

            //initial values
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(receiver, bucketStates.PENDING))).to.equal(0);

            //make payment
            const paymentId = await paymentUtil.placePayment(receiver, accounts.buyer1, amount);

            //payment now exists
            expect(await paymentSwitch.paymentExists(paymentId)).to.be.true;

            //check that amount is recorded 
            let payment: IPayment = await paymentUtil.getPayment(paymentId);
            expect(payment.payer).to.equal(addresses.buyer1);
            expect(payment.amount).to.equal(amount);
            expect(payment.id).to.equal(paymentId);
            expect(payment.refundAmount).to.equal(0);
            expect(payment.state).to.equal(bucketStates.PENDING);

            //check that ether amount is stored 
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(amount);
            
            //add to the payment 
            await paymentUtil.addToExistingPayment(paymentId, receiver, accounts.buyer1, amount * 2);

            //check that amount is recorded 
            payment = await paymentUtil.getPayment(paymentId);
            expect(payment.payer).to.equal(addresses.buyer1);
            expect(payment.amount).to.equal(amount * 3);
            expect(payment.id).to.equal(paymentId);
            expect(payment.refundAmount).to.equal(0);
            expect(payment.state).to.equal(bucketStates.PENDING);

            //check that ether amount is stored 
            expect(await paymentUtil.getBalance(paymentSwitch.target)).to.equal(amount*3);
        });
    });

    describe("Troubled Paths", function () {
        it("cannot place a payment when the amount approved is too little", async function () {
            const amount: number = 100;
            const payment = {
                receiver: addresses.seller1,
                id: 1,
                payer: addresses.buyer1,
                amount
            };
            
            await token.connect(accounts.buyer1).approve(paymentSwitch.target.toString(), amount-1);
            
            await expectRevert(
                () => paymentSwitch.placePayment(payment),
                "ERC20: insufficient allowance"
            ); 
        });

        it("cannot place a payment with insufficient funds", async function () {
            //TODO: (TEST) implement
        });

        it("cannot add to existing payment if receiver address differs", async function () {
            const id = await paymentUtil.placePayment(addresses.seller1, accounts.buyer1, 100);

            await expectRevert(
                () => paymentUtil.addToExistingPayment(id, addresses.seller2, accounts.buyer1, 50), 
                "ReceiverMismatch"
            );
        });
    });

    describe("Events", function () {
        it("placing a payment emits PaymentPlaced", async function () {
            const amount: number = 100; 
            const eventOutput = await listenForEvent(
                paymentSwitch,
                "PaymentPlaced",
                () => paymentUtil.placePayment(addresses.seller1, accounts.buyer1, amount),
                ["payer", "receiver", "amount", "id"]
            );

            expect(eventOutput.eventFired).to.be.true;
            expect(eventOutput.payer).to.equal(addresses.buyer1);
            expect(eventOutput.receiver).to.equal(addresses.seller1);
            expect(parseInt(eventOutput.amount)).to.equal(amount);
            expect(parseInt(eventOutput.id)).to.be.greaterThan(0);
        });
    });
});