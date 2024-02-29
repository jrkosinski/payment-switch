import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityContext,
    deployPaymentSwitchToken,
    deployTestToken,
    deployMasterSwitch
} from "../../utils";
import { PaymentSwitchToken, TestToken, MasterSwitch, SecurityContext } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import { Addressable } from "ethers";
import { bucketStates } from "../../constants";
import { IPayment } from "../../utils/IPayment";


describe("PaymentSwitch Native: Place Payments}", function () {
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
    
    async function placeNewPayment(
        seller: string | Addressable, 
        buyer: string | Addressable, 
        amount: number
    ): Promise<number> {
        await token.approve(paymentSwitch.target.toString(), amount);
        await paymentSwitch.placePayment(seller.toString(), { id: _paymentId++, payer: buyer.toString(), amount, refundAmount: 0});
        return _paymentId -1;
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
    
    async function getBalance(address: string | Addressable) : Promise<number> {
        return parseInt((await token.balanceOf(address.toString())).toString());
    }

    describe("Happy Paths", function () {
        it("place a payment", async function () {
            const amount: number = 1000;
            const receiver: string = addresses.seller1;

            //initial values
            expect(await getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(receiver, bucketStates.PENDING))).to.equal(0);

            //make payment
            const paymentId = await placeNewPayment(receiver, addresses.buyer1, amount);

            //payment now exists
            expect(await paymentSwitch.paymentExists(paymentId)).to.be.true;

            //check that amount is recorded 
            const payment: IPayment = await getPayment(paymentId);
            expect(payment.payer).to.equal(addresses.buyer1);
            expect(payment.amount).to.equal(amount);
            expect(payment.id).to.equal(paymentId);
            expect(payment.refundAmount).to.equal(0);
            expect(payment.state).to.equal(bucketStates.PENDING);

            //check that ether amount is stored 
            expect(await getBalance(paymentSwitch.target)).to.equal(amount);
        });

        it("place multiple payments for same seller", async function () {
            const amounts: number[] = [100, 200, 300];
            const buyers: string[] = [addresses.buyer1, addresses.buyer2, addresses.buyer1];
            const paymentIds: number[] = [];
            const receiver: string = addresses.seller1;

            //initial values
            expect(await getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(receiver, bucketStates.PENDING))).to.equal(0);

            //make payments
            for (let n = 0; n < amounts.length; n++) {
                paymentIds.push(await placeNewPayment(receiver, buyers[n], amounts[n]));
            }
            
            //test results 
            for (let n = 0; n < paymentIds.length; n++) {
                expect(await paymentSwitch.paymentExists(paymentIds[n])).to.be.true;

                //check that amount is recorded 
                const payment: IPayment = await getPayment(paymentIds[n]);
                expect(payment.payer).to.equal(buyers[n]);
                expect(payment.amount).to.equal(amounts[n]);
                expect(payment.id).to.equal(paymentIds[n]);
                expect(payment.refundAmount).to.equal(0);
                expect(payment.state).to.equal(bucketStates.PENDING);
            }

            //check that ether amount is stored 
            const expectedSum: number = amounts.reduce((a, n) => { return a + n }, 0);
            expect(await getBalance(paymentSwitch.target)).to.equal(expectedSum);
        });

        it("add to an existing payment", async function () {
            const amount: number = 1000;
            const receiver: string = addresses.seller1;

            //initial values
            expect(await getBalance(paymentSwitch.target)).to.equal(0);
            expect(parseInt(await paymentSwitch.getTotalInState(receiver, bucketStates.PENDING))).to.equal(0);

            //make payment
            const paymentId = await placeNewPayment(receiver, addresses.buyer1, amount);

            //payment now exists
            expect(await paymentSwitch.paymentExists(paymentId)).to.be.true;

            //check that amount is recorded 
            let payment: IPayment = await getPayment(paymentId);
            expect(payment.payer).to.equal(addresses.buyer1);
            expect(payment.amount).to.equal(amount);
            expect(payment.id).to.equal(paymentId);
            expect(payment.refundAmount).to.equal(0);
            expect(payment.state).to.equal(bucketStates.PENDING);

            //check that ether amount is stored 
            expect(await getBalance(paymentSwitch.target)).to.equal(amount);
            
            //add to the payment 
            await addToExistingPayment(paymentId, receiver, addresses.buyer1, amount * 2);

            //check that amount is recorded 
            payment = await getPayment(paymentId);
            expect(payment.payer).to.equal(addresses.buyer1);
            expect(payment.amount).to.equal(amount * 3);
            expect(payment.id).to.equal(paymentId);
            expect(payment.refundAmount).to.equal(0);
            expect(payment.state).to.equal(bucketStates.PENDING);

            //check that ether amount is stored 
            expect(await getBalance(paymentSwitch.target)).to.equal(amount*3);
        });
        
        describe("Troubled Paths", function () {
            it("cannot place a payment when the amount approved is wrong", async function () {
            });

            it("cannot place a payment with insufficient funds", async function () {
            });

            it("cannot add to existing payment if receiver address differs", async function () {
                const id = await placeNewPayment(addresses.seller1, addresses.buyer1, 100);

                await expect(addToExistingPayment(id, addresses.seller2, addresses.buyer1, 50)).to.be.reverted;
            });
        });
    });
});