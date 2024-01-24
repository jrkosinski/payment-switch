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
        let acc = await getTestAccounts(['admin', 'approver', 'moloch', 'multisig', 'payer', 'seller']);
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
            
            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);
             
            //TODO: can be its own type 
            const paymentData: any = {
                amount, payer, receiver: seller, state: 0
            };
            
            await switcher.placePayment(orderId.toString(), paymentData, { value: amount }); 
            
            //check that amount is recorded 
            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(paymentRecord.payer).to.equal(payer);
            expect(paymentRecord.receiver).to.equal(seller);
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.placed);
            
            //check that ether amount is stored 
            expect(await getBalanceAsNumber(switcher.target)).to.equal(amount);
        });
    });
});