import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch, 
    deployMasterSwitch
} from "../utils";
import { MasterSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../utils/security";
import { defaultFeeBps } from "../../scripts/constants";


describe("MasterSwitch: Initial State", function () {
    let master: MasterSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'system']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
        master = await deployMasterSwitch(securityManager.target);
    });

    describe("Initial State", function () {
        it("initial values", async function () {
            expect(parseInt(await master.feeBps())).to.equal(defaultFeeBps); 
            
            //TODO: also test vault addr
        });
    });
});