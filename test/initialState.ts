import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitch
} from "./utils";
import { PaymentSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "./utils/security";
import { defaultFeeBps } from "../scripts/constants";


describe("PaymentSwitch: Initial State", function () {
    let switcher: PaymentSwitch;
    let securityManager: SecurityManager;

    let addresses: any = {};

    this.beforeEach(async function () {
        let acc = await getTestAccounts(['admin', 'approver', 'dao', 'multisig']);
        addresses = acc.addresses;
        securityManager = await deploySecurityManager(addresses.admin);
        switcher = await deployPaymentSwitch(securityManager.target);

        //apply security roles
        await applySecurityRoles(securityManager, addresses);
    });

    describe("Initial State", function () {
        it("initial values", async function () {
            expect(parseInt(await switcher.feeBps())).to.equal(defaultFeeBps); 
        });
    });
});