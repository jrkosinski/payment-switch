import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityContext,
    deployPaymentSwitchNative,
    deployMasterSwitch
} from "../../utils";
import { PaymentSwitchNative, MasterSwitch, SecurityContext } from "typechain";
import { applySecurityRoles } from "../../utils/security";


describe("PaymentSwitch Native: Initial State", function () {
    let paymentSwitch: PaymentSwitchNative;
    let masterSwitch: MasterSwitch;
    let securityContext: SecurityContext;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system']);
        addresses = acc.addresses;
        securityContext = await deploySecurityContext(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityContext, addresses);
        masterSwitch = await deployMasterSwitch(securityContext.target);
        paymentSwitch = await deployPaymentSwitchNative(masterSwitch.target);
    });

    describe("Initial State", function () {
        it("initial values", async function () {
            expect(await paymentSwitch.masterSwitch()).to.equal(masterSwitch.target);
        });
    });
});