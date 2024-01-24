/*
sepolia
matic_mumbai
scroll_sepolia
bsc_testnet
optimism_sepolia
zkevm_testnet 
*/

export const defaultFeeBps: Number = 100;

export const addresses: any = {
    NETWORK: "optimism_sepolia",

    zeroAddress: "0x0000000000000000000000000000000000000000",
    sepolia: {
        zeroAddress: "0x0000000000000000000000000000000000000000",
        securityManager: "0xe07675f0eF8de2B4f32b14FBfB602Ab2C04f091E"

    },
    scroll_sepolia: {
        zeroAddress: "0x0000000000000000000000000000000000000000",
        securityManager: "0xd1714394e1B8aFC2F8e8cc088C8689909A83416c"
    },
    zkevm_testnet: {
        zeroAddress: "0x0000000000000000000000000000000000000000",
        securityManager: "0x0e36956c9be3B09A4a22DFb58C726bBc9F8b9F84"
    },
    zkevm_testnet_old: {
        zeroAddress: "0x0000000000000000000000000000000000000000",
        securityManager: "0x4B36e6130b4931DCc5A64c4bca366790aAA068d1"
    },
    optimism_goerli: {
        zeroAddress: "0x0000000000000000000000000000000000000000",
        securityManager: ""
    },
    optimism_sepolia: {
        zeroAddress: "0x0000000000000000000000000000000000000000",
        securityManager: ""
    },
    matic_mumbai: {
        zeroAddress: '0x0000000000000000000000000000000000000000',
        securityManager: '0xe21656269BB86877c6F90B287b7bb26EF9127640'
    }
}   
