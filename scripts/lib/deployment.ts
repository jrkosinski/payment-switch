import { ethers, upgrades } from "hardhat";
import {
    SecurityManager,
    ContractSizer,
    PaymentSwitch
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

export async function deployPaymentSwitch(
    securityManager: Addressable | string,
    vaultAddress: Addressable | string = "",
    feeBps: Number = 0
): Promise<PaymentSwitch> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "PaymentSwitch",
        accounts[0]
    ));

    if (!vaultAddress || vaultAddress.toString().length == 0) {
        vaultAddress = ethers.ZeroAddress;
    }

    if (feeBps <= 0)
        feeBps = defaultFeeBps;

    return (await factory.deploy(securityManager, vaultAddress, feeBps)) as any;
}

export async function deployPaymentSwitch2(
    securityManager: Addressable | string,
    vaultAddress: Addressable | string = "",
    feeBps: Number = 0
): Promise<PaymentSwitch2> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "PaymentSwitch2",
        accounts[0]
    ));

    if (!vaultAddress || vaultAddress.toString().length == 0) {
        vaultAddress = ethers.ZeroAddress;
    }

    if (feeBps <= 0)
        feeBps = defaultFeeBps;

    return (await factory.deploy(securityManager, vaultAddress, feeBps)) as any;
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
