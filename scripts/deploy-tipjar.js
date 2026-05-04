/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

function normalizePrivateKey(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function isValidPrivateKey(value) {
  const pk = normalizePrivateKey(value);
  return /^0x[0-9a-fA-F]{64}$/.test(pk);
}

async function main() {
  const ownerAddressRaw = process.env.TIPJAR_OWNER_ADDRESS;
  const deployerPkRaw = process.env.DEPLOYER_PRIVATE_KEY;

  if (!ownerAddressRaw) {
    throw new Error("TIPJAR_OWNER_ADDRESS is required in environment variables.");
  }

  if (!isValidPrivateKey(deployerPkRaw)) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY must be a valid 32-byte hex private key (0x + 64 hex chars)."
    );
  }

  const deployerPk = normalizePrivateKey(deployerPkRaw);
  const ownerAddress = hre.ethers.getAddress(ownerAddressRaw);

  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "TipJar.sol",
    "TipJar.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Missing compiled artifact at ${artifactPath}. Run: npm run contract:compile`
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new hre.ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    new hre.ethers.Wallet(deployerPk, hre.ethers.provider)
  );

  const tipJar = await factory.deploy(ownerAddress);
  await tipJar.waitForDeployment();

  const address = await tipJar.getAddress();
  console.log(`TipJar deployed at: ${address}`);
  console.log(`Owner: ${ownerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
