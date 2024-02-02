import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SecurityManager } from "typechain";

//TODO: not sure if any of these are ever used 

export async function getSecurityManager(contract: any) {
    let secManagerAddr;
    try {
        secManagerAddr = await contract.securityManager();
    }
    catch (e) {
        secManagerAddr = contract.address;
    }
    return await ethers.getContractAt("SecurityManager", secManagerAddr);
}

export async function grantRole(secMan: any, role: string, toAddress: string, caller: HardhatEthersSigner) {
    await secMan.connect(caller).grantRole(role, toAddress);
}

export async function revokeRole(secMan: any, role: string, fromAddress: string, caller: HardhatEthersSigner) {
    await secMan.connect(caller).grantRole(role, fromAddress);
}

export async function applySecurityRoles(securityManager: SecurityManager, addresses: any) {
    //TODO: this can be refactored to be more generic, later
    if (addresses.admin) {
        
    }
    if (addresses.multisig) {
        
    }   
    if (addresses.dao) {
        
    }
    if (addresses.approver) {
        
    }
}
