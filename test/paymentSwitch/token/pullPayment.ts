import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchToken,
    getTokenBalanceAsNumber,
    deployMasterSwitch
} from "../../utils";
import { PaymentSwitchToken, MasterSwitch, SecurityManager, TestToken } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import * as constants from "../../constants";
import { IPaymentRecord } from "test/IPaymentRecord";


describe("PaymentSwitch Token: Pull Payments", function () {
});