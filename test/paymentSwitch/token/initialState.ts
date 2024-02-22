import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchToken, 
    deployMasterSwitch, 
    deployTestToken
} from "../../utils";
import { PaymentSwitchToken, MasterSwitch, SecurityManager, TestToken } from "typechain";
import { applySecurityRoles } from "../../utils/security";


describe("PaymentSwitch Token: Initial State", function () {
    let paymentSwitch: PaymentSwitchToken;
    let masterSwitch: MasterSwitch;
    let securityManager: SecurityManager;
    let token: TestToken;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);

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