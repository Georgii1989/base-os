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
  const ownerRaw = process.env.TIPJAR_OWNER_ADDRESS || process.env.OS_SUPPORTER_OWNER_ADDRESS;

  if (!isValidPrivateKey(deployerPkRaw)) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing or invalid.");
  }
  if (!rpcUrl) {
    throw new Error("BASE_RPC_URL is required.");
  }
  if (!ownerRaw) {
    throw new Error("TIPJAR_OWNER_ADDRESS (or OS_SUPPORTER_OWNER_ADDRESS) is required.");
  }

  let metadataBase =
    process.env.OS_SUPPORTER_METADATA_BASE?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")}/api/ossupporter-metadata/`;

  if (!metadataBase.includes("/api/ossupporter-metadata")) {
    console.warn(
      "Warning: OS_SUPPORTER_METADATA_BASE should point to .../api/ossupporter-metadata/ on your deployed app."
    );
  }
  if (!metadataBase.endsWith("/")) {
    metadataBase += "/";
  }

  const linkedSbtRaw =
    process.env.OS_SUPPORTER_LINKED_SBT?.trim() ||
    process.env.NEXT_PUBLIC_SBT_ADDRESS?.trim() ||
    "";
  let linkedSbt = `0x${"0".repeat(40)}`;
  if (linkedSbtRaw) {
    linkedSbt = getAddress(linkedSbtRaw);
  }

  const name = process.env.OS_SUPPORTER_NAME?.trim() || "Base OS Supporter";
  const symbol = process.env.OS_SUPPORTER_SYMBOL?.trim() || "BASEOS";

  const owner = getAddress(ownerRaw);
  const deployerPk = normalizePrivateKey(deployerPkRaw);

  const provider = new JsonRpcProvider(rpcUrl, 8453);
  const signer = new Wallet(deployerPk, provider);

  const head = await provider.getBlockNumber();
  console.log(`RPC ok. Latest block: ${head}`);

  const artifact = readArtifact("BaseOSSupporterNFT.sol", "BaseOSSupporterNFT");
  const fee = await provider.getFeeData();
  const gasOverrides = {
    maxFeePerGas: fee.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined,
  };

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const nft = await deployWithRetries(
    factory,
    [name, symbol, metadataBase, linkedSbt, signer.address],
    {
      gasLimit: 2_500_000n,
      ...gasOverrides,
    }
  );
  const nftAddress = await nft.getAddress();
  console.log(`BaseOSSupporterNFT deployed at: ${nftAddress}`);

  await sendTxWithRetries(() =>
    nft.transferOwnership(owner, {
      gasLimit: 120_000n,
      ...gasOverrides,
    })
  );
  console.log(`Ownership transferred to: ${owner}`);

  console.log("\n=== Copy to .env.local / Vercel ===");
  console.log(`NEXT_PUBLIC_OS_SUPPORTER_NFT_ADDRESS=${nftAddress}`);
  console.log(`NEXT_PUBLIC_APP_URL=${metadataBase.replace(/\/api\/ossupporter-metadata\/$/, "")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
