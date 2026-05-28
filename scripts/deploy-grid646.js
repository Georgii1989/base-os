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

async function deployWithRetries(factory, args, overrides) {
  const maxAttempts = 10;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const contract = await factory.deploy(...args, {
        gasLimit: 2_800_000n,
        ...overrides,
      });
      const tx = contract.deploymentTransaction();
      if (!tx) throw new Error("No deployment transaction");
      console.log(`Deploy tx: ${tx.hash}`);
      const receipt = await tx.wait(2);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Deploy tx failed: ${tx.hash}`);
      }
      const address = await contract.getAddress();
      return { contract, address, hash: tx.hash };
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      if (
        !msg.includes("ECONNRESET") &&
        !msg.includes("ETIMEDOUT") &&
        !msg.includes("ECONNREFUSED") &&
        !msg.includes("socket hang up")
      ) {
        throw err;
      }
      if (attempt === maxAttempts) throw err;
      const backoff = 2000 * attempt;
      console.log(`Deploy attempt ${attempt} failed. Retrying in ${backoff}ms…`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

const RPC_FALLBACKS = [
  process.env.BASE_RPC_URL,
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  "https://1rpc.io/base",
].filter(Boolean);

async function main() {
  const deployerPkRaw = process.env.DEPLOYER_PRIVATE_KEY;

  if (!isValidPrivateKey(deployerPkRaw)) {
    throw new Error("DEPLOYER_PRIVATE_KEY missing or invalid in contracts.local.env");
  }

  const artifact = readArtifact("Grid646.sol", "Grid646");
  let provider;
  let lastRpcErr;
  for (const rpcUrl of RPC_FALLBACKS) {
    try {
      provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
      await provider.getBlockNumber();
      console.log(`RPC: ${rpcUrl}`);
      lastRpcErr = null;
      break;
    } catch (err) {
      lastRpcErr = err;
      console.log(`RPC failed (${rpcUrl}): ${err.message ?? err}`);
    }
  }
  if (!provider) {
    throw lastRpcErr ?? new Error("No working Base RPC");
  }
  const signer = new Wallet(normalizePrivateKey(deployerPkRaw), provider);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);

  const balance = await provider.getBalance(signer.address);
  console.log(`Deployer ${signer.address} balance: ${balance} wei`);
  const estGas = await provider.estimateGas({
    ...(await factory.getDeployTransaction()),
    from: signer.address,
  });
  const feeData = await provider.getFeeData();
  const defaultMax = feeData.maxFeePerGas ?? 10_000_000n;
  let maxFeePerGas = defaultMax;
  const needed = estGas * defaultMax;
  if (balance < needed && estGas > 0n) {
    maxFeePerGas = (balance * 88n) / 100n / estGas;
    console.log(`Low balance — using maxFeePerGas ${maxFeePerGas}`);
  }

  console.log("Deploying Grid646 to Base…");
  const deployed = await deployWithRetries(factory, [], {
    gasLimit: estGas + 80_000n,
    maxFeePerGas,
    maxPriorityFeePerGas: 1n,
  });
  const address = deployed.address;
  console.log(`Grid646 deployed at: ${address}`);
  console.log(`https://basescan.org/address/${address}`);
  console.log("");
  console.log("Add to .env.local and Vercel:");
  console.log(`NEXT_PUBLIC_GRID646_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
