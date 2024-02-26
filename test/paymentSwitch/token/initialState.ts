import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityContext,
    deployPaymentSwitchToken,
    deployMasterSwitch,
    deployTestToken
} from "../../utils";
import { PaymentSwitchToken, MasterSwitch, SecurityContext, TestToken } from "typechain";
import { applySecurityRoles } from "../../utils/security";


describe("PaymentSwitch Token: Initial State", function () {
    let paymentSwitch: PaymentSwitchToken;
    let masterSwitch: MasterSwitch;
    let securityManager: SecurityContext;
    let token: TestToken;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system']);
        addresses = acc.addresses;
        securityManager = await deploySecurityContext(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        token = await deployTestToken();
        paymentSwitch = await deployPaymentSwitchToken(masterSwitch.target, token.target);
    });

    describe("Initial State", function () {
        it("initial values", async function () {
            expect(await paymentSwitch.masterSwitch()).to.equal(masterSwitch.target);
            expect(await paymentSwitch.token()).to.equal(token.target);
        });
    });
});