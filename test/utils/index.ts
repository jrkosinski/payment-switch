import { expect } from "chai";
import { ethers } from "hardhat";
import { Addressable } from "ethers";
import { IPaymentRecord } from "./IPaymentRecord";

/**
 * Verifies that an event was fired and that the values associated with the event are as 
 * expected. 
 * @param {lambda} funcCall A remote call that should trigger the event.  
 * @param {string} eventName The name of the event expected. 
 * @param {array} expectedValues (optional) Array of values expected to be associated 
 * with the event.
 */
export async function expectEvent(funcCall: any, eventName: string, expectedValues: any[], customFunc: any = null) {
    //call the remote function 
    const tx = await funcCall();
    const rc = await tx.wait();

    //expect that the event was fired
    const evt = rc.events.find((e: any) => e.event === eventName);

    expect(evt.args).to.not.be.undefined;

    //expect the expected values 
    if (expectedValues && expectedValues.length) {
        for (let n = 0; n < expectedValues.length; n++) {
            expect(evt.args[n]).to.equal(expectedValues[n]);
        }
    }

    if (customFunc != null)
        customFunc(evt);
}

/**
 * Executes an action on a contract that should trigger an event, listens for that event, 
 * and returns the parameters associated with the event that was caught. 
 * @param {BaseContract} contract A contract object to which the event belongs.  
 * @param {string} eventName The name of the event expected. 
 * @param {lambda} triggerAction The async contract call which should trigger the event. 
 * @param {string[]} paramNames (optional) Names of expected event params (max 4). 
 */
export async function listenForEvent(
    contract: any,
    eventName: string,
    triggerAction: any,
    paramNames: string[], 
    timeoutMs: number = 0
): Promise<any> {
    const output: any = await new Promise(async (resolve, reject) => {
        contract.on(eventName, (param1: any, param2: any, param3: any, param4: any) => {
            const obj: any = {
                eventFired: true
            };
            const params = [param1, param2, param3, param4];
            paramNames.forEach((s, i) => {
                obj[s] = params[i];
            })
            resolve(obj);
        });

        //trigger and wait for event 
        await triggerAction();

        if (timeoutMs > 0) {
            await sleep(timeoutMs);
            resolve({
                eventFired: false
            });
        }
    });

    return output;
}

/**
 * Verifies that a smart contract call that is expected to revert, reverts with the 
 * expected error message. 
 * @param {lambda} funcCall A smart contract call that is expected to revert
 * @param {string} revertMessage The expected revert message from the transaction (optional)
 */
export async function expectRevert(funcCall: any, revertMessage: string | null = null, params: any = null) {
    if (revertMessage) {
        if (params && Array.isArray(params)) {
            let paramsString = "";
            params.forEach((e: string) => {
                if (paramsString.length)
                    paramsString += ", ";   
                paramsString += e;
            });
            revertMessage += `(${paramsString})`;
        }
        await expect(
            funcCall()
        ).to.be.revertedWith(revertMessage );
    }
    else {
        await expect(
            funcCall()
        ).to.be.reverted;
    }
}

/**
 * Returns a list of named addresses from Signers. 
 * @param names List of address property names (e.g. 'addr1', 'addr2', etc.)
 * @returns { name0: <address>, name1: <address> ... etc. }
 */
export async function getTestAddresses(names: string[]) {
    const all = (await getTestAccounts(names));
    return all && all.addresses ? all.addresses : [];
}

/**
 * Returns a list of named addresses and accounts from Signers. 
 * @param names List of address property names (e.g. 'addr1', 'addr2', etc.)
 * @returns { 
 *      accounts: [name0: <account>, name1: <account> ... etc.] 
 *      addresses: [name0: <address>, name1: <address> ... etc.] 
 * }
 */
export async function getTestAccounts(names: string[]) {
    const signers = await ethers.getSigners();
    const addresses: any = {};
    const accounts: any = {};
    const promises = [];
    for (let i = 0; i < names.length; i++) {
        promises.push(signers[i].getAddress());
    }
    await Promise.all(promises);
    for (let i = 0; i < names.length; i++) {
        addresses[names[i]] = await promises[i];
        accounts[names[i]] = signers[i];
    }

    return { addresses, accounts };
}

export async function sleep(ms: number) {
    return await (new Promise(resolve => setTimeout(resolve, ms)));
}

export async function getBalanceAsNumber(address: string | Addressable): Promise<number> {
    return parseInt((await ethers.provider.getBalance(address)).toString());
}

export async function getTokenBalanceAsNumber(tokenAddress: string | Addressable, address: string | Addressable): Promise<number> {
    const token = await ethers.getContractAt("TestToken", tokenAddress);
    return parseInt(
        (await token.balanceOf(address)).toString()
    );
}

//TODO: comment 
export function convertPendingBucket(response: any): any {
    const output: { total: number, payments: any[] } = { total: 0, payments: [] };
    output.total = parseInt(response[0]);
    output.payments = [];
    const objects = response[1];
    objects.forEach((o: any) => {
        output.payments.push({
            orderId: parseInt(o[0]),
            payer: o[1],
            amount: parseInt(o[2]),
            refunded: o[3]
        });
    });
    return output;
}

export function createOrderId() : number {
    return Math.floor(Math.random() * 999999999) +1;
}

export async function placePayment(paymentSwitch: any, 
    sellerAddr: string, 
    buyerAddr: string, 
    amount: number,
    orderId: number = 0
) {
    if (orderId <= 0) {
        orderId = createOrderId();
    }
    
    const paymentData: IPaymentRecord = {
        amount, payer: buyerAddr, orderId: orderId, refunded: false
    };

    await paymentSwitch.placePayment(sellerAddr, paymentData, { value: amount });
    return paymentData;
}

export { revokeRole, grantRole, getSecurityManager } from "./security";
export {
    deployPaymentSwitchNative,
    deployPaymentSwitchToken,
    deployMasterSwitch,
    deploySecurityContext, 
    deployContractSizer, 
    deployTestToken,
    deployTestPaymentBook_Buckets,
    deployTestPaymentBook_Payments
} from "../../scripts/lib/deployment"; 