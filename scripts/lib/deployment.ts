import { ethers, upgrades } from "hardhat";
import {
    SecurityManager,
    ContractSizer,
    PaymentSwitch, 
    MasterSwitch
} from "typechain";
import { Addressable } from "ethers";
import { defaultFeeBps } from "../constants";


export async function deployContractSizer() {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "ContractSizer",
        accounts[0]
    ));

    return (await factory.deploy()) as ContractSizer;
}

export async function deploySecurityManager(adminAddress: string): Promise<SecurityManager> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "SecurityManager",
        accounts[0]
    ));

    return (await factory.deploy(adminAddress)) as any;
}

export async function deployMasterSwitch(
    securityManager: Addressable | string,
    vaultAddress: Addressable | string = "",
    feeBps: Number = 0
): Promise<MasterSwitch> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "MasterSwitch",
        accounts[0]
    ));

    if (!vaultAddress || vaultAddress.toString().length == 0) {
        vaultAddress = ethers.ZeroAddress;
    }

    if (feeBps <= 0)
        feeBps = defaultFeeBps;

    return (await factory.deploy(securityManager, vaultAddress, feeBps)) as any;
}

export async function deployPaymentSwitch(
    masterSwitch: Addressable | string,
    tokenAddress: Addressable | string = ""
): Promise<PaymentSwitch> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "PaymentSwitch",
        accounts[0]
    ));

    if (!masterSwitch || masterSwitch.toString().length == 0) {
        masterSwitch = ethers.ZeroAddress;
    }
    
    if (!tokenAddress || tokenAddress.toString().length == 0) {
        tokenAddress = ethers.ZeroAddress;
    }

    return (await factory.deploy(masterSwitch, tokenAddress)) as any;
}

export async function upgradeProxy(
    address: string | Addressable, 
    newContractName: string) 
{
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        newContractName,
        accounts[0]
    ));
    return await upgrades.upgradeProxy(address, factory);
}
