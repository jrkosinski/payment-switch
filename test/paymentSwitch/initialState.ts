import { expect } from "chai";
import { ethers } from "hardhat";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch, 
    deployMasterSwitch
} from "../utils";
import { PaymentSwitch, MasterSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../utils/security";


describe("PaymentSwitch: Initial State", function () {
    let paymentSwitch: PaymentSwitch;
    let masterSwitch: MasterSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
        masterSwitch = await deployMasterSwitch(securityManager.target);
        paymentSwitch = await deployPaymentSwitch(masterSwitch.target);
    });

    describe("Initial State", function () {
        it("initial values", async function () {
            expect(await paymentSwitch.masterSwitch()).to.equal(masterSwitch.target);
            expect(await paymentSwitch.tokenAddress()).to.equal(ethers.ZeroAddress);
            
            //TODO: other properties
            //TODO: test non-zero token addr
        });
    });
});