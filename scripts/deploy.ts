import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
    deploySecurityManager,
    deployPaymentSwitch, 
    deployMasterSwitch
} from "./lib/deployment";
import { run } from "./lib/runner";
import {
    sleep
} from "./utils";


run(async (provider: HardhatEthersProvider, owner: HardhatEthersSigner) => {

    //OPTIMISM SEPOLIA:
    // security manager: 0x2353640E45274cFdcbE550Bcb7bb2B9c382f7ab1
    // payment switch: 0xD48425B7fb702F571D872f4b7046B30c9FA47e15

    //deploy security manager 
    const securityManager = await deploySecurityManager(owner.address);
    console.log("security manager:", securityManager.target);
    await sleep(3000);
    
    //deploy the switch 
    const paymentSwitch = await deployMasterSwitch(securityManager.target, owner.address, 100);
    console.log("payment switch:", paymentSwitch.target);
    await sleep(3000);
}); 