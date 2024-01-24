import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch,
    getBalanceAsNumber
} from "./utils";
import { PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "./utils/security";
import * as constants from "./constants";


describe("PaymentSwitch: Push Payments", function () {
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

    describe("Push Payments", function () {
        it("push a simple successful payment", async function () {
            const orderId: number = 1109938;
            const amount: number = 100000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.none);

            //TODO: can be its own type 
            const paymentData: any = {
                amount, payer, receiver: seller, state: 1
            };

            //make the payment 
            await switcher.placePayment(orderId.toString(), paymentData, { value: amount });

            //initial values 
            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.placed);
            let sellerBalance = await getBalanceAsNumber(seller);
            expect(await getBalanceAsNumber(switcher.target)).to.equal(amount);

            //approve the payment 
            await switcher.approvePayment(orderId.toString());
            
            paymentRecord = await switcher.getPayment(orderId.toString());
            expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.approved);
            
            //push the payment 
            await switcher.pushPayment(seller); 
            
            //ensure that the funds have moved
            sellerBalance = sellerBalance + amount;
            expect(await getBalanceAsNumber(seller)).to.equal(sellerBalance);
            expect(await getBalanceAsNumber(switcher.target)).to.equal(0);
        });
    });
});