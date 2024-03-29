import { ethers, upgrades } from "hardhat";
import {
    SecurityContext,
    ContractSizer,
    PaymentSwitchNative, 
    PaymentSwitchToken,
    MasterSwitch,
    TestToken,
    TestPaymentBook,
    TestPaymentBook_Payments,
    TestPaymentBook_Buckets
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

export async function deploySecurityContext(adminAddress: string): Promise<SecurityContext> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "SecurityContext",
        accounts[0]
    ));

    return (await factory.deploy(adminAddress)) as any;
}

export async function deployMasterSwitch(
    securityContext: Addressable | string,
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

    return (await factory.deploy(securityContext, vaultAddress, feeBps)) as any;
}

export async function deployPaymentSwitchNative(
    masterSwitch: Addressable | string
): Promise<PaymentSwitchNative> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "PaymentSwitchNative",
        accounts[0]
    ));

    if (!masterSwitch || masterSwitch.toString().length == 0) {
        masterSwitch = ethers.ZeroAddress;
    }

    return (await factory.deploy(masterSwitch)) as any;
}

export async function deployPaymentSwitchToken(
    masterSwitch: Addressable | string,
    tokenAddress: Addressable | string = ""
): Promise<PaymentSwitchToken> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "PaymentSwitchToken",
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

export async function deployTestToken(
    name: string = "Test",
    symbol: string = "TST"
): Promise<TestToken> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "TestToken",
        accounts[0]
    ));

    return (await factory.deploy(name, symbol)) as any;
}

export async function deployTestPaymentBook_Payments(): Promise<TestPaymentBook_Payments> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "TestPaymentBook_Payments",
        accounts[0]
    ));
    return (await factory.deploy()) as any;
}

export async function deployTestPaymentBook_Buckets(): Promise<TestPaymentBook_Buckets> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "TestPaymentBook_Buckets",
        accounts[0]
    ));
    return (await factory.deploy()) as any;
}

export async function deployTestPaymentBook_Move(): Promise<TestPaymentBook_Move> {
    const accounts = await ethers.getSigners();
    const factory: any = (await ethers.getContractFactory(
        "TestPaymentBook_Move",
        accounts[0]
    ));
    return (await factory.deploy()) as any;
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
