/* eslint-disable @typescript-eslint/no-require-imports */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

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
