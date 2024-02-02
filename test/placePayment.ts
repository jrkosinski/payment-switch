import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch, 
    getBalanceAsNumber
} from "./utils";
import { PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "./utils/security";
import * as constants from "./constants";


describe("PaymentSwitch: Place Payments", function () {
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

    describe("Make Payments", function () {
        it("make and record a simple successful payment", async function () {
            const orderId: number = 1109938; 
            const amount: number = 100000000; 
            const { payer, seller } = addresses;
            let paymentRecord: any = null;
            
            //initial values
            expect(await getBalanceAsNumber(switcher.target)).to.equal(0);
            
            paymentRecord = await switcher.getPendingPayment(addresses.seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);
             
            //TODO: can be its own type 
            const paymentData: any = {
                amount, payer, orderId: orderId, refunded: false
            };
            
            await switcher.placePayment(addresses.seller, paymentData, { value: amount }); 
            
            //check that amount is recorded 
            paymentRecord = await switcher.getPendingPayment(addresses.seller, orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            expect(paymentRecord.refunded).to.equal(false);
            
            //check that ether amount is stored 
            expect(await getBalanceAsNumber(switcher.target)).to.equal(amount);
        });
    });
});