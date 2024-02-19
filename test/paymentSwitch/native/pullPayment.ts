import { expect } from "chai";
import {
    getTestAccounts,
    deploySecurityManager,
    deployPaymentSwitchNative,
    getBalanceAsNumber,
    deployMasterSwitch
} from "../../utils";
import { PaymentSwitchNative, MasterSwitch, SecurityManager } from "typechain";
import { applySecurityRoles } from "../../utils/security";
import * as constants from "../../constants";
import { IPaymentRecord } from "test/IPaymentRecord";


describe("PaymentSwitch: Pull Payments", function () {
});