import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchNative, 
    getBalanceAsNumber,
    deployMasterSwitch
} from "../utils";
import { MasterSwitch, PaymentSwitchNative, SecurityManager } from "typechain";
import { applySecurityRoles } from "../utils/security";
import * as constants from "../constants";
import { IPaymentRecord } from "test/IPaymentRecord";


describe("PaymentSwitch: Place Payments", function () {
    let masterSwitch: MasterSwitch;
    let paymentSwitch: PaymentSwitchNative;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Make Payments", function () {
        it("make and record a simple successful payment", async function () {
            const orderId: number = 1109938; 
            const amount: number = 100000000; 
            const { payer, seller } = addresses;
            let paymentRecord: any = null;
            
            //initial values
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(0);

            //TODO: make sure that no payment record exists already
            //paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            //expect(parseInt(paymentRecord.amount)).to.equal(0);
             
            const paymentData: IPaymentRecord = {
                amount, payer, orderId: orderId, refunded: false
            };
            
            await paymentSwitch.placePayment(addresses.seller, paymentData, { value: amount }); 

            //check that amount is recorded 
            paymentRecord = await paymentSwitch.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(paymentRecord.refunded).to.equal(false);
            
            //check that ether amount is stored 
            expect(await getBalanceAsNumber(paymentSwitch.target)).to.equal(amount);
        });
    });
});