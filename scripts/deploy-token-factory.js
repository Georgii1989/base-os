/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { ContractFactory, Wallet, JsonRpcProvider } = require("ethers");

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
      if (!isRetryableRpcError(err) || attempt === maxAttempts) throw err;
      const backoffMs = 1500 * attempt;
      console.log(`Deploy attempt ${attempt} failed. Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }
  throw lastErr;
}

async function main() {
  const deployerPkRaw = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.BASE_RPC_URL;

  if (!isValidPrivateKey(deployerPkRaw)) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing or invalid.");
  }
  if (!rpcUrl) {
    throw new Error("BASE_RPC_URL is required.");
  }

  const deployerPk = normalizePrivateKey(deployerPkRaw);
  const provider = new JsonRpcProvider(rpcUrl, 8453);
  const signer = new Wallet(deployerPk, provider);

  const head = await provider.getBlockNumber();
  console.log(`RPC ok. Latest block: ${head}`);

  const artifact = readArtifact("TokenFactory.sol", "TokenFactory");
  const fee = await provider.getFeeData();
  const gasOverrides = {
    maxFeePerGas: fee.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined,
  };

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const deployed = await deployWithRetries(factory, [], {
    gasLimit: 3_500_000n,
    ...gasOverrides,
  });
  const address = await deployed.getAddress();
  console.log(`TokenFactory deployed at: ${address}`);
  console.log("\n=== Copy to .env.local / Vercel ===");
  console.log(`NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
