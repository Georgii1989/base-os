/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { ContractFactory, Wallet, JsonRpcProvider, getAddress } = require("ethers");

function loadEnvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", "contracts.local.env"));

function normalizePrivateKey(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function isValidPrivateKey(value) {
  const pk = normalizePrivateKey(value);
  return /^0x[0-9a-fA-F]{64}$/.test(pk);
}

function readArtifact(sourceName, contractName) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    sourceName,
    `${contractName}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing artifact: ${artifactPath}. Run: npm run contract:compile:hardhat`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRpcError(err) {
  const msg = String(err && err.message ? err.message : err);
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("socket hang up")
  );
}

async function deployWithRetries(factory, args, overrides) {
  const maxAttempts = 6;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const contract = await factory.deploy(...args, overrides);
      await contract.waitForDeployment();
      return contract;
    } catch (err) {
      lastErr = err;
      if (!isRetryableRpcError(err) || attempt === maxAttempts) {
        throw err;
      }
      const backoff = 1500 * attempt;
      console.log(`Deploy attempt ${attempt} failed. Retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function sendTxWithRetries(sendFn) {
  const maxAttempts = 6;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const tx = await sendFn();
      await tx.wait();
      return tx;
    } catch (err) {
      lastErr = err;
      if (!isRetryableRpcError(err) || attempt === maxAttempts) {
        throw err;
      }
      const backoff = 1500 * attempt;
      console.log(`Tx attempt ${attempt} failed. Retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function main() {
  const deployerPkRaw = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.BASE_RPC_URL;
  const ownerRaw = process.env.TIPJAR_OWNER_ADDRESS;
  const tipJarRaw = process.env.TIPJAR_ADDRESS;

  if (!isValidPrivateKey(deployerPkRaw)) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing or invalid.");
  }
  if (!rpcUrl) {
    throw new Error("BASE_RPC_URL is required.");
  }
  if (!ownerRaw) {
    throw new Error("TIPJAR_OWNER_ADDRESS is required.");
  }
  if (!tipJarRaw) {
    throw new Error("TIPJAR_ADDRESS is required (existing deployed TipJar contract).");
  }

  const owner = getAddress(ownerRaw);
  const tipJarAddress = getAddress(tipJarRaw);
  const deployerPk = normalizePrivateKey(deployerPkRaw);

  const provider = new JsonRpcProvider(rpcUrl, 8453);
  const signer = new Wallet(deployerPk, provider);

  const head = await provider.getBlockNumber();
  console.log(`RPC ok. Latest block: ${head}`);

  const sbtArtifact = readArtifact("BaseSupporterSBT.sol", "BaseSupporterSBT");
  const routerArtifact = readArtifact("TipWithBadgeRouter.sol", "TipWithBadgeRouter");

  const sbtName = process.env.SBT_NAME || "Base Supporter Badge";
  const sbtSymbol = process.env.SBT_SYMBOL || "BSBT";
  const sbtBaseUri = process.env.SBT_BASE_URI || "";

  const fee = await provider.getFeeData();
  const gasOverrides = {
    maxFeePerGas: fee.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined,
  };

  const sbtFactory = new ContractFactory(sbtArtifact.abi, sbtArtifact.bytecode, signer);
  const sbt = await deployWithRetries(
    sbtFactory,
    [sbtName, sbtSymbol, sbtBaseUri, signer.address],
    {
      gasLimit: 2_000_000n,
      ...gasOverrides,
    }
  );
  const sbtAddress = await sbt.getAddress();
  console.log(`BaseSupporterSBT deployed at: ${sbtAddress}`);

  const routerFactory = new ContractFactory(routerArtifact.abi, routerArtifact.bytecode, signer);
  const router = await deployWithRetries(routerFactory, [tipJarAddress, sbtAddress], {
    gasLimit: 1_500_000n,
    ...gasOverrides,
  });
  const routerAddress = await router.getAddress();
  console.log(`TipWithBadgeRouter deployed at: ${routerAddress}`);

  await sendTxWithRetries(() =>
    sbt.setMinter(routerAddress, true, {
      gasLimit: 250_000n,
      ...gasOverrides,
    })
  );
  console.log(`Router authorized as minter on SBT.`);

  await sendTxWithRetries(() =>
    sbt.transferOwnership(owner, {
      gasLimit: 200_000n,
      ...gasOverrides,
    })
  );
  console.log(`SBT ownership transferred to: ${owner}`);

  console.log("\n=== Copy these to .env.local / Vercel ===");
  console.log(`NEXT_PUBLIC_TIPJAR_ADDRESS=${routerAddress}`);
  console.log(`NEXT_PUBLIC_SBT_ADDRESS=${sbtAddress}`);
  console.log(`NEXT_PUBLIC_SBT_FROM_BLOCK=${head}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
