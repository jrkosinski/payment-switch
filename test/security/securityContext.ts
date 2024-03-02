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

describe("SecurityContext", function () {
    let securityContext: SecurityContext;
    let masterSwitch: MasterSwitch;
    let paymentSwitch: PaymentSwitchNative;
    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'nonAdmin1', 'nonAdmin2']);
        addresses = acc.addresses;
        accounts = acc.accounts;

        securityContext = await deploySecurityContext(addresses.admin);
        masterSwitch = await deployMasterSwitch(securityContext.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);
    });

    describe("Construction", function () {
        it("initial state", async function () {
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin2)).to.be.false;
        });

        it("can grant admin to a different address at construction", async function () {
            const secMan = await deploySecurityContext(addresses.nonAdmin1);

            expect(await secMan.hasRole(constants.roles.admin, addresses.admin)).to.be.false;
            expect(await secMan.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.true;
            expect(await secMan.hasRole(constants.roles.admin, addresses.nonAdmin2)).to.be.false;
        });
    });


    describe("Restrictions", function () {

        this.beforeEach(async function () {
            await grantRole(securityContext, constants.roles.upgrader, addresses.admin, accounts.admin);
            await grantRole(securityContext, constants.roles.pauser, addresses.admin, accounts.admin);
        });

        it("cannot set zero address to security manager", async function () {
            await expectRevert(
                () => masterSwitch.setSecurityContext(constants.addresses.zeroAddress),
                constants.errorMessages.ZERO_ADDRESS
            )
        });

        it("cannot set zero address to product nft security manager", async function () {
            await expectRevert(
                () => masterSwitch.setSecurityContext(constants.addresses.zeroAddress),
                constants.errorMessages.ZERO_ADDRESS
            )
        });

        it("cannot set zero address to whitelist security manager", async function () {
            await expectRevert(
                () => masterSwitch.setSecurityContext(constants.addresses.zeroAddress),
                constants.errorMessages.ZERO_ADDRESS
            )
        });

        it("cannot set bogus address for security manager", async function () {
            await expectRevert(
                () => masterSwitch.setSecurityContext(paymentSwitch.target.toString()),
                constants.errorMessages.INVALID_CONTRACT_METHOD
            );
        });

        it("cannot set non-contract address for security manager", async function () {
            await expectRevert(
                () => masterSwitch.setSecurityContext(addresses.admin),
                constants.errorMessages.INVALID_CONTRACT_METHOD
            );
        });

        it("admin cannot renounce admin role", async function () {

            //admin has admin role
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;

            //try to renounce
            await securityContext.renounceRole(constants.roles.admin, addresses.admin);

            //role not renounced (should fail silently)
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;
        });

        it("admin can renounce non-admin role", async function () {

            //admin has role
            expect(await securityContext.hasRole(constants.roles.pauser, addresses.admin)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.upgrader, addresses.admin)).to.be.true;

            //try to renounce
            await securityContext.renounceRole(constants.roles.pauser, addresses.admin);
            await securityContext.renounceRole(constants.roles.upgrader, addresses.admin);

            //role is renounced
            expect(await securityContext.hasRole(constants.roles.pauser, addresses.admin)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.upgrader, addresses.admin)).to.be.false;
        });

        it("admin can revoke their own non-admin role", async function () {

            //admin has admin role
            expect(await securityContext.hasRole(constants.roles.pauser, addresses.admin)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.upgrader, addresses.admin)).to.be.true;

            //try to renounce
            await securityContext.revokeRole(constants.roles.pauser, addresses.admin);
            await securityContext.revokeRole(constants.roles.upgrader, addresses.admin);

            //role is renounced
            expect(await securityContext.hasRole(constants.roles.pauser, addresses.admin)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.upgrader, addresses.admin)).to.be.false;
        });

        it("admin cannot revoke their own admin role", async function () {

            //admin has admin role
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;

            //try to renounce
            await securityContext.revokeRole(constants.roles.admin, addresses.admin);

            //role not renounced (should fail silently)
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;
        });

        it("admin role can be revoked by another admin", async function () {

            //grant admin to another 
            await securityContext.grantRole(constants.roles.admin, addresses.nonAdmin1);

            //now both users are admin 
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.true;

            //2 admins enter, 1 admin leaves
            await securityContext.connect(accounts.nonAdmin1).revokeRole(constants.roles.admin, addresses.admin);

            //only one admin remains
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.true;
        });

        it("admin role can be transferred in two steps", async function () {

            const a = accounts.admin;
            const b = accounts.nonAdmin1;

            //beginning state: a is admin, b is not 
            expect(await securityContext.hasRole(constants.roles.admin, a.address)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, b.address)).to.be.false;

            //transfer in two steps 
            await securityContext.grantRole(constants.roles.admin, b.address);
            await securityContext.connect(b).revokeRole(constants.roles.admin, a.address);

            //beginning state: b is admin, a is not 
            expect(await securityContext.hasRole(constants.roles.admin, a.address)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, b.address)).to.be.true;

        });

        it("cannot renounce another address's role", async function () {
            await securityContext.grantRole(constants.roles.pauser, addresses.nonAdmin1);
            await securityContext.grantRole(constants.roles.pauser, addresses.nonAdmin2);

            expect(await securityContext.hasRole(constants.roles.pauser, addresses.nonAdmin1)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.pauser, addresses.nonAdmin2)).to.be.true;

            await expectRevert(
                () => securityContext.connect(accounts.nonAdmin1).renounceRole(constants.roles.pauser, addresses.nonAdmin2),
                constants.errorMessages.ACCESS_CONTROL_RENOUNCE
            );

            await expectRevert(
                () => securityContext.connect(accounts.nonAdmin2).renounceRole(constants.roles.pauser, addresses.nonAdmin1),
                constants.errorMessages.ACCESS_CONTROL_RENOUNCE
            );

            await expect(securityContext.connect(accounts.nonAdmin1).renounceRole(constants.roles.pauser, addresses.nonAdmin1)).to.not.be.reverted;
            await expect(securityContext.connect(accounts.nonAdmin2).renounceRole(constants.roles.pauser, addresses.nonAdmin2)).to.not.be.reverted;
        });
    });
    //TODO: (TEST) shared security

    describe("Transfer Adminship", function () {
        it("can grant admin to self", async function () {
            await securityContext.grantRole(constants.roles.admin, addresses.admin);

            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin2)).to.be.false;
        });

        it("can transfer admin to another", async function () {
            await securityContext.grantRole(constants.roles.admin, addresses.nonAdmin1);

            //now there are two admins
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin2)).to.be.false;

            await securityContext.connect(accounts.nonAdmin1).revokeRole(constants.roles.admin, addresses.admin);

            //now origin admin has had adminship revoked 
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.true;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin2)).to.be.false;
        });

        it("can pass adminship along", async function () {
            await securityContext.grantRole(constants.roles.admin, addresses.nonAdmin1);
            await securityContext.connect(accounts.nonAdmin1).revokeRole(constants.roles.admin, addresses.admin);
            await securityContext.connect(accounts.nonAdmin1).grantRole(constants.roles.admin, addresses.nonAdmin2);
            await securityContext.connect(accounts.nonAdmin2).revokeRole(constants.roles.admin, addresses.nonAdmin1);

            //in the end, adminship has passed from admin to nonAdmin1 to nonAdmin2
            expect(await securityContext.hasRole(constants.roles.admin, addresses.admin)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.false;
            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin2)).to.be.true;
        });
    });

    describe("Events", function () {
        it("rolegranted event fires on grantRole", async () => {
            expectEvent(async () => await securityContext.grantRole(constants.roles.admin, addresses.nonAdmin1),
                "RoleGranted", [constants.roles.admin, addresses.nonAdmin1, addresses.admin]);
        });

        it("roleRevoked event fires on revokeRole", async () => {
            await securityContext.grantRole(constants.roles.admin, addresses.nonAdmin1);

            expect(await securityContext.hasRole(constants.roles.admin, addresses.nonAdmin1)).to.be.true;
            expectEvent(async () => await securityContext.revokeRole(constants.roles.admin, addresses.nonAdmin1),
                "RoleRevoked", [constants.roles.admin, addresses.nonAdmin1, addresses.admin]);
        });

        it("roleRevoked event fires on renounceRole", async () => {
            expectEvent(async () => await securityContext.renounceRole(constants.roles.admin, addresses.admin),
                "RoleRevoked", [constants.roles.admin, addresses.nonAdmin1, addresses.admin]);
        });
    });
});