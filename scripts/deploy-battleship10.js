/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { ContractFactory, Wallet, JsonRpcProvider } = require("ethers");

const BASE_CHAIN_ID = 8453;
const DEFAULT_DEPLOY_GAS = 3_500_000n;
const RPC_PROBE_MS = 15_000;

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

function isTransientRpcError(err) {
  const msg = String(err?.message ?? err);
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("TIMEOUT") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("socket hang up") ||
    msg.includes("RPC probe timeout") ||
    msg.includes("failed to detect network")
  );
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`${label} timeout after ${ms}ms`);
    }),
  ]);
}

const RPC_FALLBACKS = [
  "https://base.drpc.org",
  "https://rpc.ankr.com/base",
  "https://base-rpc.publicnode.com",
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  process.env.BASE_RPC_URL,
].filter(Boolean);

async function probeRpc(rpcUrl) {
  const provider = new JsonRpcProvider(rpcUrl, BASE_CHAIN_ID, { staticNetwork: true });
  const block = await withTimeout(provider.getBlockNumber(), RPC_PROBE_MS, `RPC ${rpcUrl}`);
  console.log(`RPC OK: ${rpcUrl} (block ${block})`);
  return provider;
}

async function deployViaBroadcast(signer, factory, overrides) {
  const deployTx = await factory.getDeployTransaction();
  const nonce = await withTimeout(
    signer.provider.getTransactionCount(signer.address, "pending"),
    RPC_PROBE_MS,
    "getTransactionCount"
  );
  const txRequest = {
    ...deployTx,
    chainId: BASE_CHAIN_ID,
    nonce,
    gasLimit: DEFAULT_DEPLOY_GAS,
    type: 2,
    ...overrides,
  };
  const signed = await signer.signTransaction(txRequest);
  const sent = await withTimeout(
    signer.provider.broadcastTransaction(signed),
    RPC_PROBE_MS,
    "broadcastTransaction"
  );
  console.log(`Deploy tx (broadcast): ${sent.hash}`);
  const receipt = await withTimeout(sent.wait(1), 180_000, "tx.wait");
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Deploy tx failed: ${sent.hash}`);
  }
  const address = receipt.contractAddress;
  if (!address) throw new Error("No contract address in receipt");
  return { address, hash: sent.hash };
}

async function deployWithRetries(factory, signer, overrides) {
  const maxAttempts = 6;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt <= 2) {
        const contract = await factory.deploy({
          gasLimit: DEFAULT_DEPLOY_GAS,
          ...overrides,
        });
        const tx = contract.deploymentTransaction();
        if (!tx) throw new Error("No deployment transaction");
        console.log(`Deploy tx: ${tx.hash}`);
        const receipt = await withTimeout(tx.wait(1), 180_000, "tx.wait");
        if (!receipt || receipt.status !== 1) {
          throw new Error(`Deploy tx failed: ${tx.hash}`);
        }
        const address = await contract.getAddress();
        return { address, hash: tx.hash };
      }
      return await deployViaBroadcast(signer, factory, overrides);
    } catch (err) {
      lastErr = err;
      if (!isTransientRpcError(err) || attempt === maxAttempts) throw err;
      const backoff = 1500 * attempt;
      console.log(`Deploy attempt ${attempt} failed (${err.message ?? err}). Retry in ${backoff}ms…`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function tryDeployOnRpc(rpcUrl, signerPk, artifact) {
  const provider = await probeRpc(rpcUrl);
  const signer = new Wallet(signerPk, provider);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);

  const balance = await withTimeout(
    provider.getBalance(signer.address),
    RPC_PROBE_MS,
    "getBalance"
  );
  console.log(`Deployer ${signer.address} balance: ${balance} wei`);

  const maxFeePerGas =
    balance < DEFAULT_DEPLOY_GAS * 8_000_000n
      ? (balance * 85n) / 100n / DEFAULT_DEPLOY_GAS
      : 8_000_000n;
  if (maxFeePerGas < 1_000_000n) {
    throw new Error(`Insufficient balance on ${rpcUrl}`);
  }
  console.log(`Using gasLimit=${DEFAULT_DEPLOY_GAS} maxFeePerGas=${maxFeePerGas}`);

  console.log("Deploying Battleship10 to Base…");
  return deployWithRetries(factory, signer, {
    maxFeePerGas,
    maxPriorityFeePerGas: 1n,
  });
}

async function main() {
  const deployerPkRaw = process.env.DEPLOYER_PRIVATE_KEY;
  if (!isValidPrivateKey(deployerPkRaw)) {
    throw new Error("DEPLOYER_PRIVATE_KEY missing or invalid in contracts.local.env");
  }
  const deployerPk = normalizePrivateKey(deployerPkRaw);
  const artifact = readArtifact("Battleship10.sol", "Battleship10");

  const seen = new Set();
  let lastErr;
  for (const rpcUrl of RPC_FALLBACKS) {
    if (seen.has(rpcUrl)) continue;
    seen.add(rpcUrl);
    try {
      const deployed = await tryDeployOnRpc(rpcUrl, deployerPk, artifact);
      const address = deployed.address;
      console.log(`Battleship10 deployed at: ${address}`);
      console.log(`https://basescan.org/address/${address}`);
      console.log("");
      console.log("Add to .env.local and Vercel:");
      console.log(`NEXT_PUBLIC_BATTLESHIP10_ADDRESS=${address}`);
      console.log(`NEXT_PUBLIC_BATTLESHIP10_MASK_PLACEMENT=1`);
      return;
    } catch (err) {
      lastErr = err;
      console.log(`Failed on ${rpcUrl}: ${err.message ?? err}`);
    }
  }
  throw lastErr ?? new Error("All RPC endpoints failed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
