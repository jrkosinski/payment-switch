import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchNative,
    deployMasterSwitch
} from "../../utils";
import { MasterSwitch, PaymentSwitchNative, SecurityManager } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import * as constants from "../../constants";


describe("Batches: Batches", function () {
    let masterSwitch: MasterSwitch;
    let paymentSwitch: PaymentSwitchNative;
    let securityManager: SecurityManager;

    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system', 'payer', 'seller']);
        addresses = acc.addresses;
        accounts = acc.accounts;
        
        securityManager = await deploySecurityManager(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });
    
    interface IPayment {
        orderId: number, 
        payer: string, 
        amount: number
    }

    function toPaymentBucket(object: any) {
        const output: { total: number, state: number, payments: IPayment[]} = { total: 0, state: 0, payments: [] };
        output.total = object.total;
        output.state = object.state;
        for (let n=0; n<object.payments.length; n++) {
            output.payments.push(
                { 
                    orderId: object.payments[n].orderId, 
                    payer: object.payments[n].payer, 
                    amount: object.payments[n].amount
                }
            );
        }
        return output;
    }

    function toPaymentBuckets(objects: any[]) {
        const output = [];
        for (let n=0; n<objects.length; n++) {
            output.push(toPaymentBucket(objects[n]));
        }
        return output;
    }

    describe("Approve Batched Payments", function () {
    
        it("approve a simple successful batch", async function () {
            let amount; 
            amount = 1000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 100
            }, { value: amount });
            amount = 2000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 200
            }, { value: amount });
            amount = 3000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 300
            }, { value: amount });
            
            console.log();
            console.log("after adding:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));

            await paymentSwitch.connect(accounts.approver).pendingToReady(addresses.seller);
            await paymentSwitch.connect(accounts.approver).approvePayments(addresses.seller);

            console.log();
            console.log("after approving:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));

            await paymentSwitch.connect(accounts.dao).processPayments(addresses.seller);

            console.log();
            console.log("after processing:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller))[0].paymentList.payments);

            amount = 4000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 400
            }, { value: amount });
            amount = 5000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 500
            }, { value: amount });

            console.log();
            console.log("after adding more:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller))[0].paymentList.payments);

            await paymentSwitch.connect(accounts.approver).pendingToReady(addresses.seller);
            await paymentSwitch.connect(accounts.approver).approvePayments(addresses.seller);

            console.log();
            console.log("after approving again:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));

            await paymentSwitch.connect(accounts.dao).processPayments(addresses.seller);

            console.log();
            console.log("after processing again:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller))[0].paymentList.payments);

        });

        it("remove a payment", async function () {
            let amount;
            amount = 1000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 100
            }, { value: amount });
            amount = 2000000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 200
            }, { value: amount });
            amount = 300000;
            await paymentSwitch.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: amount,
                orderId: 300
            }, { value: amount });
            
            await paymentSwitch.connect(accounts.system).removePayment(200);

            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));

            await paymentSwitch.connect(accounts.approver).approvePayments(addresses.seller); 
            
            console.log();
            console.log("after approving:")
            console.log(toPaymentBucket(await paymentSwitch.getPendingPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller)));
            //console.log(toPaymentBuckets(await paymentSwitch.getApprovedPayments(addresses.seller))[0].paymentList.payments);

            console.log(await paymentSwitch.getAmountApproved(addresses.seller));
        });
    });
});