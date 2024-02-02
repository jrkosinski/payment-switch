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
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'multisig', 'payer', 'seller']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        switcher = await deployPaymentSwitch(securityManager.target, addresses.admin, 100);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Push Payments", function () {
        it("push a simple successful payment", async function () {
            const orderId: number = 1109938;
            const amount: number = 1000000000;
            const { payer, seller } = addresses;
            let paymentRecord: any = null;

            paymentRecord = await switcher.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(0);

            //TODO: can be its own type 
            const paymentData: any = {
                amount, payer, receiver: seller, refunded: false, orderId: orderId
            };

            //make the payment 
            await switcher.placePayment(seller, paymentData, { value: amount });

            //initial values 
            paymentRecord = await switcher.getPendingPayment(seller, orderId.toString());
            expect(parseInt(paymentRecord.amount)).to.equal(amount);
            expect(parseInt(paymentRecord.orderId)).to.equal(orderId);
            
            //check seller initial balance
            let sellerBalance = await getBalanceAsNumber(seller);
            expect(await getBalanceAsNumber(switcher.target)).to.equal(amount);

            //approve the payment 
            await switcher.approvePayments(seller);

            //TODO: shouldn't fail 
            //paymentRecord = await switcher.getPendingPayment(seller, orderId.toString());
            //expect(parseInt(paymentRecord.state)).to.equal(constants.paymentStates.approved);
            
            //TODO: test processing payments separately 
            await switcher.processPayments(seller); 
            
            //push the payment 
            await switcher.pushPayment(seller); 
            
            //ensure that the funds have moved
            sellerBalance = (sellerBalance + amount) - (amount * 0.01); //TODO: get fee bps dynamically
            expect(await getBalanceAsNumber(seller)).to.equal(sellerBalance);
            
            //fee has not been pushed out to vault yet 
            expect(await getBalanceAsNumber(switcher.target)).to.equal(amount * 0.01);
        });
    });
});