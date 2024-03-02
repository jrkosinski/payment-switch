import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SecurityContext } from "typechain";
import * as constants from "../constants";

//TODO: not sure if any of these are ever used 

export async function getSecurityContext(contract: any) {
    let secManagerAddr;
    try {
        secManagerAddr = await contract.securityContext();
    }
    catch (e) {
        secManagerAddr = contract.address;
    }
    return await ethers.getContractAt("SecurityContext", secManagerAddr);
}

export async function grantRole(secMan: any, role: string, toAddress: string, caller: HardhatEthersSigner) {
    await secMan.connect(caller).grantRole(role, toAddress);
}

export async function revokeRole(secMan: any, role: string, fromAddress: string, caller: HardhatEthersSigner) {
    await secMan.connect(caller).grantRole(role, fromAddress);
}

export async function applySecurityRoles(securityContext: SecurityContext, addresses: any) {
    //TODO: this can be refactored to be more generic, later
    if (addresses.admin) {
        await securityContext.grantRole(constants.roles.admin, addresses.admin);
        await securityContext.grantRole(constants.roles.refunder, addresses.admin);
        await securityContext.grantRole(constants.roles.approver, addresses.admin);
        await securityContext.grantRole(constants.roles.system, addresses.admin);
        await securityContext.grantRole(constants.roles.dao, addresses.admin);
        await securityContext.grantRole(constants.roles.pauser, addresses.admin);
        await securityContext.grantRole(constants.roles.upgrader, addresses.admin);
    }
    if (addresses.pauser) {
        await securityContext.grantRole(constants.roles.pauser, addresses.pauser);
    }
    if (addresses.upgrader) {
        await securityContext.grantRole(constants.roles.upgrader, addresses.upgrader);
    }
    if (addresses.system) {
        await securityContext.grantRole(constants.roles.system, addresses.system);
    }   
    if (addresses.dao) {
        await securityContext.grantRole(constants.roles.dao, addresses.dao);
    }
    if (addresses.approver) {
        await securityContext.grantRole(constants.roles.approver, addresses.approver);
        await securityContext.grantRole(constants.roles.refunder, addresses.approver);
    }
    if (addresses.refunder) {
        await securityContext.grantRole(constants.roles.refunder, addresses.refunder);
    }
}
