/* eslint-disable @typescript-eslint/no-require-imports */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ${deployer.address} balance: ${balance} wei`);

  const Factory = await hre.ethers.getContractFactory("Battleship10");
  console.log("Deploying Battleship10…");
  const contract = await Factory.deploy({ gasLimit: 3_500_000n });
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`Battleship10 deployed at: ${address}`);
  console.log(`https://basescan.org/address/${address}`);
  console.log("");
  console.log("Add to .env.local and Vercel:");
  console.log(`NEXT_PUBLIC_BATTLESHIP10_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_BATTLESHIP10_MASK_PLACEMENT=1`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
