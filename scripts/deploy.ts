import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
    deploySecurityManager,
    deployPaymentSwitch
} from "./lib/deployment";
import { run } from "./lib/runner";
import {
    sleep
} from "./utils";


run(async (provider: HardhatEthersProvider, owner: HardhatEthersSigner) => {

    //deploy security manager 
    const securityManager = await deploySecurityManager(owner.address);
    console.log("security manager:", securityManager.target);
    await sleep(3000);
    
    //deploy the switch 
    const paymentSwitch = await deployPaymentSwitch(securityManager.target, owner.address, 100);
    console.log("payment switch:", paymentSwitch.target);
    await sleep(3000);
}); 