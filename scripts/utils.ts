import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Addressable } from "ethers";
import { ethers } from "hardhat";

import {
    addresses
} from "./constants";

export async function sleep(ms: number) {
    return await (new Promise(resolve => setTimeout(resolve, ms)));
}
