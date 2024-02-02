import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch
} from "./utils";
import { PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "./utils/security";
import * as constants from "./constants";


describe.skip("Batches: Batches", function () {
    let switcher: PaymentSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'multisig', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        switcher = await deployPaymentSwitch(securityManager.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });
    
    interface IPayment {
        orderId: number, 
        payer: string, 
        amount: number
    }

    function toPaymentBucket(object: any) {
        const output: { total: number, paymentList: {status: number, payments: IPayment[]}} = { total: 0, paymentList: { status: 0, payments: []}};
        output.total = object.total;
        output.paymentList.status = object.paymentList.status;
        for (let n=0; n<object.paymentList.payments.length; n++) {
            output.paymentList.payments.push(
                { 
                    orderId: object.paymentList.payments[n].orderId, 
                    payer: object.paymentList.payments[n].payer, 
                    amount: object.paymentList.payments[n].amount
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

    describe("Approve Payments", function () {
    
        it("approve a simple successful payment", async function () {
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 1000000,
                orderId: 100
            });
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 2000000,
                orderId: 200
            });
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 3000000,
                orderId: 300
            });
            
            console.log();
            console.log("after adding:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));
            
            await switcher.approvePayments(addresses.seller);

            console.log();
            console.log("after approving:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));

            await switcher.processPayments(addresses.seller);

            console.log();
            console.log("after processing:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller))[0].paymentList.payments);

            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 4000000,
                orderId: 400
            });
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 5000000,
                orderId: 500
            });

            console.log();
            console.log("after adding more:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller))[0].paymentList.payments);

            await switcher.approvePayments(addresses.seller);

            console.log();
            console.log("after approving again:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));

            await switcher.processPayments(addresses.seller);

            console.log();
            console.log("after processing again:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller))[0].paymentList.payments);

        });

        it("remove a payment", async function () {
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 1000000,
                orderId: 100
            });
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 2000000,
                orderId: 200
            });
            await switcher.placePayment(addresses.seller, {
                payer: addresses.payer,
                refunded: false,
                amount: 3000000,
                orderId: 300
            });
            
            await switcher.removePayment(addresses.seller, 200);

            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));

            await switcher.approvePayments(addresses.seller); 
            
            console.log();
            console.log("after approving:")
            console.log(toPaymentBucket(await switcher.getPendingPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller)));
            console.log(toPaymentBuckets(await switcher.getApprovedPayments(addresses.seller))[0].paymentList.payments);

            console.log(await switcher.getAmountOwed(addresses.seller));
        });
    });
});