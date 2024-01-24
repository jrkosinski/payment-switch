import { ethers } from "hardhat";

/**
 * Passes in to main the following parameters: 
 * provider
 * owner 
 * addr1
 * addr2
 * If more addresses are needed, they can be gotten manually from ethers.getSigners() in the 
 * main function itself.  
 */
async function doRun(main: any): Promise<void> {
    const [owner, addr1, addr2] = await ethers.getSigners();
    await main(ethers.provider, owner, addr1, addr2);
}

export function run(main: any) {
    doRun(main)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
