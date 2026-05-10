# Base OS

Standard web app for Base App migration:
- wallet connection with `wagmi`,
- SIWE sign-in flow (`viem/siwe`),
- onchain tip transaction via the `TipJar` contract,
- Solidity `TipJar` smart contract + Hardhat deploy flow.

## Stack

- Next.js 16 (App Router)
- wagmi + viem
- @base-org/account connector
- React Query
- Solidity + Hardhat

## Local setup

1) Install dependencies:

```bash
npm install
```

2) Create env file:

```bash
cp .env.example .env.local
```

3) Adjust env if needed (defaults match the deployed TipJar + builder code):

```env
NEXT_PUBLIC_TIPJAR_ADDRESS=0x47ad142c4f04431164737cACD601796932b7357A
NEXT_PUBLIC_BASE_BUILDER_CODE=YOUR-BUILDER-CODE
NEXT_PUBLIC_APP_URL=https://base-tips.vercel.app

# Optional — soulbound (ERC-721) supporter NFT + on-chain holder registry in the UI
NEXT_PUBLIC_SBT_ADDRESS=0xYourSoulboundNft
# Recommended — block where the soulbound contract was deployed (full mint history for the registry)
NEXT_PUBLIC_SBT_FROM_BLOCK=12345678
# Optional — for Tip Profile full history (without this: last ~100k blocks)
NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK=12345678
```

4) Run app:

```bash
npm run dev
```

## Production checks

```bash
npm run lint
npm run build
```

## Smart contract: TipJar

1) Create contract env file from template:

```bash
cp contracts.env.example contracts.local.env
```

2) Fill values in `contracts.local.env` (do not put these secrets in `.env` — Next.js loads `.env*` during builds):

- `DEPLOYER_PRIVATE_KEY` - deploy wallet private key (with ETH on Base for gas)
- `TIPJAR_OWNER_ADDRESS` - your public owner wallet
- `BASE_RPC_URL` - Base RPC endpoint
- `BASESCAN_API_KEY` - for contract verification

3) Compile contract:

```bash
npm run contract:compile
```

If `npm run contract:compile:hardhat` fails with `HH502` (cannot download Solidity compiler metadata), use `npm run contract:compile` — it compiles via the local `solc` npm package and writes `artifacts/contracts/TipJar.sol/TipJar.json`.

4) Deploy to Base mainnet:

```bash
npm run contract:deploy:base
```

This runs `node scripts/deploy-tipjar.js` (loads `contracts.local.env`, uses `ethers` directly). If you see intermittent `ECONNRESET` on a public RPC, the script retries; for production deploys prefer a dedicated RPC (Alchemy/Infura) via `BASE_RPC_URL`.

5) Optional verification:

```bash
npx hardhat verify --network base <DEPLOYED_CONTRACT_ADDRESS> <TIPJAR_OWNER_ADDRESS>
```

## Soulbound badge flow

Deploy the soulbound system (SBT + tip router) after your `TipJar` is already deployed:

1) In `contracts.local.env`, add these values:

- `TIPJAR_ADDRESS` - deployed `TipJar` address (existing contract)
- `SBT_NAME` - NFT collection name (example: `Base Supporter Badge`)
- `SBT_SYMBOL` - NFT symbol (example: `BSBT`)
- `SBT_BASE_URI` - metadata base URI for token metadata

2) Compile contracts with Hardhat:

```bash
npm run contract:compile:hardhat
```

3) Deploy SBT + router:

```bash
npm run contract:deploy:soulbound
```

The script deploys:
- `BaseSupporterSBT` (non-transferable ERC-721),
- `TipWithBadgeRouter` (calls `TipJar.tip()` and mints badge once per sender),
- and grants router minter permissions.

It also prints the exact frontend env values to paste (`NEXT_PUBLIC_TIPJAR_ADDRESS`, `NEXT_PUBLIC_SBT_ADDRESS`, `NEXT_PUBLIC_SBT_FROM_BLOCK`).

## Soulbound registry (optional UI)

When you deploy an ERC-721 soulbound (non-transferable badge) contract on Base, set `NEXT_PUBLIC_SBT_ADDRESS` in `.env.local`.

The app scans **`Transfer` mint events** (`from` = zero address) on that contract, dedupes wallets, and shows a **public supporter list** with **Copy addresses** and **Download CSV** so you can run follow-ups (allowlists, rewards, outreach).

For a **complete** history (not just recent blocks), also set `NEXT_PUBLIC_SBT_FROM_BLOCK` to the block number where the soulbound contract was deployed.

## Verify mint flow

After one test tip in production:

1) Open transaction on BaseScan.
2) Confirm `Interacted With` is your `TipWithBadgeRouter`.
3) Confirm an `ERC-721 Tokens Transferred` row exists:
   - `From`: `0x000...0000`
   - `To`: tip sender address
   - `Token`: your `BaseSupporterSBT`

If those three checks pass, tip + soulbound mint flow is live.

## Notes

- This project is migrated away from Farcaster mini-app SDK flow.
- For Base App readiness, keep metadata and builder settings updated in Base.dev.
- Builder Code is applied in code via wagmi `dataSuffix` inside `src/lib/wagmiConfig.ts` and read from `NEXT_PUBLIC_BASE_BUILDER_CODE`.
