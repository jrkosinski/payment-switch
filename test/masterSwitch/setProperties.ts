import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployMasterSwitch
} from "../utils";
import { MasterSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../utils/security";
import { defaultFeeBps } from "../../scripts/constants";
import { ethers } from "hardhat";


describe("MasterSwitch: Set Properties", function () {
    let master: MasterSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};
    let accounts: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'dao', 'vault1', 'vault2']);
        addresses = acc.addresses;
        accounts = acc.accounts;
        securityManager = await deploySecurityManager(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
        master = await deployMasterSwitch(securityManager.target);
    });

    it("set feeBps", async function () {
        expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps);
        
        //set new value 
        const feeBps1 = 10010;
        await master.connect(accounts.dao).setFeeBps(feeBps1);

        expect(parseInt(await master.feeBps())).to.equal(feeBps1);

        //set new value 
        const feeBps2 = 20020;
        await master.connect(accounts.dao).setFeeBps(feeBps2);

        expect(parseInt(await master.feeBps())).to.equal(feeBps2);
    });

    it("set set vaultAddress", async function () {
        expect(await master.vaultAddress()).to.equal(ethers.ZeroAddress);

        //set new value 
        const vaultAddress1 = addresses.vault1;
        await master.connect(accounts.dao).setVaultAddress(addresses.vault1);
        
        expect(await master.vaultAddress()).to.equal(addresses.vault1);

        //set new value 
        const feeBps2 = 20020;
        await master.connect(accounts.dao).setVaultAddress(addresses.vault2);

        expect(await master.vaultAddress()).to.equal(addresses.vault2);
    });
});