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

    //deploy the switch 
    const paymentSwitch = await ethers.getContractAt("PaymentSwitch", "0x50Be05b5c0C6b0180A0be9BC9EC03E7D3E3034AA");
    console.log("payment switch fee bps:", await paymentSwitch.feeBps());
}); 