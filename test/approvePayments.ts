import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch
} from "./utils";
import { PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "./utils/security";
import * as constants from "./constants";


describe("PaymentSwitch: Approve Payments", function () {
    let switcher: PaymentSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'moloch', 'multisig', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        switcher = await deployPaymentSwitch(securityManager.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Approve Payments", function () {
        it("approve a simple successful payment", async function () {
            const orderId: number = 1109938;
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.none); 

            //TODO: can be its own type 
            const paymentData: any = {
                amount, payer, receiver: seller, state: 3
            };

            //make the payment 
            await switcher.placePayment(orderId.toString(), paymentData, { value: amount });
            
            //initial values 
            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.placed);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(await switcher.getApprovedFunds(seller))).to.equal(0);
            
            //approve the payment 
            await switcher.approvePayment(orderId.toString());

            //payment should be approved
            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.approved);
            
            //approved payments should be in the holding pot 
            expect(parseInt(await switcher.getApprovedFunds(seller))).to.equal(amount);
        });
    });
});