import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchNative, 
    deployMasterSwitch
} from "../utils";
import { MasterSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../utils/security";
import { defaultFeeBps } from "../../scripts/constants";
import { ethers } from "hardhat";


describe("MasterSwitch: Initial State", function () {
    let master: MasterSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    describe("With no Vault Address", function () {
        this.beforeEach(async function () {
            let acc = await getTestAccounts(['admin']);
            addresses = acc.addresses;
            securityManager = await deploySecurityManager(addresses.admin);

            //apply security roles
            await applySecurityRoles(securityManager, addresses);
            master = await deployMasterSwitch(securityManager.target);
        });

        describe("Initial State", function () {
            it("initial values", async function () {
                expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps);
                expect(await master.vaultAddress()).to.equal(ethers.ZeroAddress);
            });
        });
    });

    describe("With Vault Address", function () {
        this.beforeEach(async function () {
            let acc = await getTestAccounts(['admin', 'vault']);
            addresses = acc.addresses;
            securityManager = await deploySecurityManager(addresses.admin);

            //apply security roles
            await applySecurityRoles(securityManager, addresses);
            master = await deployMasterSwitch(securityManager.target, addresses.vault);
        });

        describe("Initial State", function () {
            it("initial values", async function () {
                expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps);
                expect(await master.vaultAddress()).to.equal(addresses.vault);
            });
        });
    });
});