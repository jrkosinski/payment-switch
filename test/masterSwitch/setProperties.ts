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


describe("MasterSwitch: Set Properties", function () {
    let master: MasterSwitch;
    let securityContext: SecurityContext;

    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'dao', 'vault']);
        addresses = acc.addresses;
        accounts = acc.accounts;
        securityContext = await deploySecurityContext(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityContext, addresses);
        master = await deployMasterSwitch(securityContext.target);
    });

    it("set fee Bps", async function () {
        expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps);
        await master.connect(accounts.dao).setFeeBps(defaultFeeBps + 1)
        expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps+1);
    });

    it("set vault address", async function () {
        expect(await master.vaultAddress()).to.equal(ethers.ZeroAddress);
        await master.connect(accounts.dao).setVaultAddress(addresses.vault);
        expect(await master.vaultAddress()).to.equal(addresses.vault);
    });
});