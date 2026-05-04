/* eslint-disable @typescript-eslint/no-require-imports */
const hre = require("hardhat");

async function main() {
  const ownerAddress = process.env.TIPJAR_OWNER_ADDRESS;

  if (!ownerAddress) {
    throw new Error("TIPJAR_OWNER_ADDRESS is required in environment variables.");
  }

  const tipJarFactory = await hre.ethers.getContractFactory("TipJar");
  const tipJar = await tipJarFactory.deploy(ownerAddress);
  await tipJar.waitForDeployment();

  const address = await tipJar.getAddress();
  console.log(`TipJar deployed at: ${address}`);
  console.log(`Owner: ${ownerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
