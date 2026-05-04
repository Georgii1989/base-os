/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

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

const { ContractFactory, Wallet, JsonRpcProvider, getAddress } = require("ethers");

function normalizePrivateKey(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function isValidPrivateKey(value) {
  const pk = normalizePrivateKey(value);
  return /^0x[0-9a-fA-F]{64}$/.test(pk);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function deployWithRetries(factory, constructorArgs, overrides) {
  const maxAttempts = 6;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const contract = await factory.deploy(...constructorArgs, overrides);
      await contract.waitForDeployment();
      return contract;
    } catch (err) {
      lastErr = err;
      const msg = String(err && err.message ? err.message : err);
      const retryable =
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("socket hang up");

      if (!retryable || attempt === maxAttempts) {
        throw err;
      }

      const backoffMs = 1500 * attempt;
      console.log(`Deploy attempt ${attempt} failed (${msg}). Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  throw lastErr;
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
  const ownerAddress = getAddress(ownerAddressRaw);

  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    throw new Error("BASE_RPC_URL is required in environment variables.");
  }

  const provider = new JsonRpcProvider(rpcUrl, 8453);
  try {
    const u = new URL(rpcUrl);
    // Intentionally do not log full URL (may contain API keys in the path)
    console.log(`Using RPC host: ${u.host}`);
  } catch {
    console.log("Using RPC: (unparsed URL)");
  }

  // Smoke test RPC before deploying (helps diagnose intermittent TLS resets)
  const head = await provider.getBlockNumber();
  console.log(`RPC ok. Latest block: ${head}`);

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
  const factory = new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    new Wallet(deployerPk, provider)
  );

  const fee = await provider.getFeeData();
  const tipJar = await deployWithRetries(factory, [ownerAddress], {
    // Public RPCs can be flaky during estimation; explicit limits reduce retries needed.
    gasLimit: 1_500_000n,
    maxFeePerGas: fee.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined,
  });

  const address = await tipJar.getAddress();
  console.log(`TipJar deployed at: ${address}`);
  console.log(`Owner: ${ownerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
