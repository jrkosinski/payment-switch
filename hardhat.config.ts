/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat";
import "dotenv/config";
import "hardhat-deploy";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/balance";
import "./tasks/block-number";
import "./tasks/create-collectibles";


const MAINNET_RPC_URL =
    process.env.MAINNET_RPC_URL ||
    process.env.ALCHEMY_MAINNET_RPC_URL ||
    "https://eth-mainnet.alchemyapi.io/v2/your-api-key";
    
const MNEMONIC = process.env.MNEMONIC || "your mnemonic";

const ETHERSCAN_API_KEY =
    process.env.ETHERSCAN_API_KEY || "Your etherscan API key";

module.exports = {
    defaultNetwork: "hardhat",
    localTableland: {
        silent: false,
        verbose: false,
    },
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
        },
        matic_mumbai: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 80001,
            url: `https://polygon-mumbai-bor.publicnode.com`,
        },
        goerli: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 5,
            url: `https://eth-goerli.g.alchemy.com/v2/${process.env.GOERLI_API_KEY}`,
        },
        optimism_goerli: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 420,
            url: `https://goerli.optimism.io`,
        },
        sepolia: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 11155111,
            url: `https://sepolia.infura.io/v3/${process.env.SEPOLIA_API_KEY}`,
        },
        op_sepolia: {
            url: "https://sepolia.optimism.io",
            chainId: 11155420,
            gasPrice: 8000000000,
            gasMultiplier: 2,
            accounts: [`${process.env.PRIVATE_KEY}`],
        },
        optimism_sepolia: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 11155420,
            url: `https://sepolia.optimism.io`,
        },
        bsc_testnet: {  
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 97, 
            url: `https://data-seed-prebsc-1-s3.binance.org:8545`
        },
        zkevm_testnet: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 1442,
            url: `https://rpc.public.zkevm-test.net`
        },
        scroll_sepolia: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 534351,
            url: `https://sepolia-rpc.scroll.io/`,
        },
        mantle_testnet: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 5001,
            url: `https://rpc.testnet.mantle.xyz`
        },
        filecoin_testnet: {
            accounts: [`${process.env.PRIVATE_KEY}`],
            chainId: 314159,
            url: `https://filecoin-calibration.chainup.net/rpc/v1`
        }, 
    },
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: ETHERSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer.
        },
        feeCollector: {
            default: 1,
        },
    },
    solidity: {
        version: "0.8.7",
        settings: {
            //optimizer: {
            //    enabled: true,
            //    runs: 5000
            //},
            //viaIR: true,
        },
        compilers: [
            {
                version: "0.8.16",
            },
        ],
    },
    mocha: {
        timeout: 100000,
    },
    typechain: {
        outDir: "typechain",
        target: "ethers-v5",
    },
};
