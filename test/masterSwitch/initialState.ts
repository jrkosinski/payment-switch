import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityContext,
    deployMasterSwitch
} from "../utils";
import { MasterSwitch, SecurityContext } from "typechain";
import { applySecurityRoles } from "../utils/security";
import { defaultFeeBps } from "../../scripts/constants";
import { ethers } from "hardhat";


describe("MasterSwitch: Initial State", function () {
    let master: MasterSwitch;
    let securityContext: SecurityContext;

    let addresses: any = {};

    describe("With no Vault Address", function () {
        this.beforeEach(async function () {
            let acc = await getTestAccounts(['admin']);
            addresses = acc.addresses;
            securityContext = await deploySecurityContext(addresses.admin);

            //apply security roles
            await applySecurityRoles(securityContext, addresses);
            master = await deployMasterSwitch(securityContext.target);
        });

        it("initial values", async function () {
            expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps);
            expect(await master.vaultAddress()).to.equal(ethers.ZeroAddress);
        });
    });

    describe("With Vault Address", function () {
        this.beforeEach(async function () {
            let acc = await getTestAccounts(['admin', 'vault']);
            addresses = acc.addresses;
            securityContext = await deploySecurityContext(addresses.admin);

            //apply security roles
            await applySecurityRoles(securityContext, addresses);
            master = await deployMasterSwitch(securityContext.target, addresses.vault);
        });

        it("initial values", async function () {
            expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps);
            expect(await master.vaultAddress()).to.equal(addresses.vault);
        });
    });
});