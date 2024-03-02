import { expect } from "chai";
import * as constants from "../constants";
import { MasterSwitch, PaymentSwitchNative, SecurityContext } from "typechain";
import {
    getTestAccounts,
    deploySecurityContext,
    deployMasterSwitch,
    deployPaymentSwitchNative,
    expectEvent,
    expectRevert,
    grantRole
} from "../utils";
import { applySecurityRoles } from "../utils/security";
import { PaymentUtil } from "../utils/PaymentUtil";

describe("Security: Restrictions", function () {
    let securityContext: SecurityContext;
    let securityContext2: SecurityContext;
    let masterSwitch: MasterSwitch;
    let paymentSwitch: PaymentSwitchNative;
    let paymentUtil: PaymentUtil;
    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'seller', 'buyer', 'dao', 'system', 'pauser', 'upgrader', 'approver', 'refunder']);
        addresses = acc.addresses;
        accounts = acc.accounts;

        securityContext = await deploySecurityContext(addresses.admin);
        securityContext2 = await deploySecurityContext(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityContext.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);
        paymentUtil = new PaymentUtil(paymentSwitch);
        
        await applySecurityRoles(securityContext, addresses);
    });

    describe("Restrictions", function () {
        describe("Positive Cases", function () {
            it("admin can change security context", async function () {
                await expect(masterSwitch.connect(accounts.admin).setSecurityContext(securityContext2.target.toString())).to.not.be.reverted;
            });

            it("approver can approve payments", async function () {
                const receiver: string = addresses.seller;
                
                await paymentUtil.placePayments(
                    [receiver, receiver], 
                    [addresses.buyer, addresses.buyer],
                    [100, 200]
                );
                
                await paymentSwitch.freezePending(receiver);
                
                await expect(paymentSwitch.connect(accounts.approver).approvePayments(receiver)).to.not.be.reverted;
            });

            it("approver can approve batches of payments", async function () {
                //TODO: (TEST) implement
            });

            it("approver can review payments", async function () {
                const receiver: string = addresses.seller;

                const ids: number[] = await paymentUtil.placePayments(
                    [receiver, receiver],
                    [addresses.buyer, addresses.buyer],
                    [100, 200]
                );

                await paymentSwitch.freezePending(receiver);

                //move a payment to review
                await expect(paymentSwitch.connect(accounts.approver).reviewPayment(ids[1])).to.not.be.reverted;
            });

            it("approver can freeze the pending bucket", async function () {
                const receiver: string = addresses.seller;

                await paymentUtil.placePayments(
                    [receiver, receiver],
                    [addresses.buyer, addresses.buyer],
                    [100, 200]
                );

                await expect(paymentSwitch.connect(accounts.approver).freezePending(receiver)).to.not.be.reverted;
            });

            it("approver can freeze a pending batch", async function () {
                //TODO: (TEST) implement
            });

            it("refunder can refund payment", async function () {
                //TODO: (TEST) implement
            });

            it("dao can change fee bps", async function () {
                await expect(masterSwitch.connect(accounts.admin).setFeeBps(1000)).to.not.be.reverted;
            });

            it("dao can set the vault address", async function () {
                await expect(masterSwitch.connect(accounts.admin).setVaultAddress(addresses.admin)).to.not.be.reverted;
            });

            it("dao can process payments", async function () {
                await expect(paymentSwitch.connect(accounts.admin).processPayments(addresses.seller)).to.not.be.reverted;
            });

            it("dao can process batches of payments", async function () {
                
            });

            it("dao can push payments", async function () {
                await expect(paymentSwitch.connect(accounts.admin).pushPayment(addresses.seller)).to.not.be.reverted;
            });
        }); 

        describe("Negative Cases", function () {
            it("non-admin cannot change security context", async function () {
                await expect(masterSwitch.connect(accounts.seller).setSecurityContext(securityContext2.target.toString())).to.be.reverted;
            });

            it("non-approver cannot approve payments", async function () {
                const receiver: string = addresses.seller;

                await paymentUtil.placePayments(
                    [receiver, receiver],
                    [addresses.buyer, addresses.buyer],
                    [100, 200]
                );

                await paymentSwitch.freezePending(receiver);

                await expectRevert(
                    () => paymentSwitch.connect(accounts.buyer).approvePayments(receiver), 
                    constants.errorMessages.UNAUTHORIZED_ACCESS
                );
            });

            it("non-approver cannot approve batches of payments", async function () {
                //TODO: (TEST) implement
            });

            it("non-approver cannot review payments", async function () {
                const receiver: string = addresses.seller;

                const ids: number[] = await paymentUtil.placePayments(
                    [receiver, receiver],
                    [addresses.buyer, addresses.buyer],
                    [100, 200]
                );

                await paymentSwitch.freezePending(receiver);
                
                //move a payment to review
                await expectRevert(
                    () => paymentSwitch.connect(accounts.pauser).reviewPayment(ids[1]), 
                    constants.errorMessages.UNAUTHORIZED_ACCESS
                );
            });

            it("non-approver cannot freeze the pending bucket", async function () {
                const receiver: string = addresses.seller;

                await paymentUtil.placePayments(
                    [receiver, receiver],
                    [addresses.buyer, addresses.buyer],
                    [100, 200]
                );

                await expectRevert(
                    () => paymentSwitch.connect(accounts.refunder).freezePending(receiver),
                    constants.errorMessages.UNAUTHORIZED_ACCESS
                );
            });

            it("non-approver cannot freeze a pending batch", async function () {
                //TODO: (TEST) implement
            });

            it("non-refunder cannot refund payment", async function () {
                //TODO: (TEST) implement
            });

            it("non-dao cannot change fee bps", async function () {
                await expectRevert(
                    () => masterSwitch.connect(accounts.approver).setFeeBps(200),
                    constants.errorMessages.UNAUTHORIZED_ACCESS
                );
            });

            it("non-dao cannot set the vault address", async function () {
                await expectRevert(
                    () => masterSwitch.connect(accounts.approver).setVaultAddress(addresses.admin), 
                    constants.errorMessages.UNAUTHORIZED_ACCESS
                );
            });

            it("non-dao cannot process payments", async function () {
                //TODO: (TEST) implement
            });

            it("non-dao cannot process batches of payments", async function () {
                //TODO: (TEST) implement            
            });

            it("non-dao cannot push payments", async function () {
                //TODO: (TEST) implement
            });
        }); 
    });
});