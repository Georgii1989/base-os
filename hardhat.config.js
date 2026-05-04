/* eslint-disable @typescript-eslint/no-require-imports */
require("@nomicfoundation/hardhat-toolbox");
const fs = require("node:fs");
const path = require("node:path");

// Keep contract deploy secrets OUT of `.env` because Next.js auto-loads `.env*` during builds.
const contractsEnvPath = path.join(__dirname, "contracts.local.env");
if (fs.existsSync(contractsEnvPath)) {
  require("dotenv").config({ path: contractsEnvPath });
} else {
  require("dotenv").config();
}

const PRIVATE_KEY_RAW = process.env.DEPLOYER_PRIVATE_KEY || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

function normalizePrivateKey(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function isValidPrivateKey(value) {
  const pk = normalizePrivateKey(value);
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) return false;
  return true;
}

const PRIVATE_KEY = isValidPrivateKey(PRIVATE_KEY_RAW)
  ? normalizePrivateKey(PRIVATE_KEY_RAW)
  : "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      url: BASE_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 8453,
      timeout: 120_000,
    },
  },
  etherscan: {
    apiKey: {
      base: BASESCAN_API_KEY,
    },
  },
  sourcify: {
    enabled: true,
  },
};
