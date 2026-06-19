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

3) Adjust env if needed (`.env.example` has production defaults: **router** tips + soulbound + [app-base-os.vercel.app](https://app-base-os.vercel.app/)):

```env
# TipWithBadgeRouter — tips forward to TipJar + mint tip-profile badge once per address
NEXT_PUBLIC_TIPJAR_ADDRESS=0xDd1090aFba3117953B892A6390B18abe5A979894
NEXT_PUBLIC_BASE_BUILDER_CODE=YOUR-BUILDER-CODE
NEXT_PUBLIC_APP_URL=https://app-base-os.vercel.app

NEXT_PUBLIC_SBT_ADDRESS=0x3736b7A4fC567192AA359CaDd8407786C556F729
NEXT_PUBLIC_SBT_FROM_BLOCK=45587033
# Optional — for Tip Profile full history (without this: last ~100k blocks)
NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK=45000000
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

## Base analytics (DeFi Llama)

The **Analytics** tab lets you pick a data source:

- **DeFi Llama** — TVL, DEX volume, fees, stablecoins, protocols
- **L2BEAT** — daily transactions & UOPS on Base
- **Blockscout** — on-chain network stats (txs, addresses, gas)

Data is proxied through `GET /api/analytics/base?source=defillama|l2beat|blockscout` (cached ~5 minutes). No API key required.

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

## Token launcher (ERC-20 on Base)

Users deploy a standard ERC-20 from the **Launch** tab; **they pay gas** in their connected wallet.

1) Compile factory contracts:

```bash
npm run contract:compile:hardhat
```

2) Deploy `TokenFactory` to Base (uses `contracts.local.env`):

```bash
npm run contract:deploy:factory
```

3) Paste into `.env.local` / Vercel:

```env
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x...
```

Until that env var is set, the Launch tab shows deploy instructions instead of the form.

## Base Verify — sybil-resistant claim demo

The **Base Verify** tab integrates the flow from [Base Verify docs](https://docs.base.org/base-account/guides/verify-social-accounts) and [base/base-verify-demo](https://github.com/base/base-verify-demo): social account verification with deterministic anti-sybil tokens.

Flow: connect wallet → pick provider (X / Coinbase / Instagram / TikTok) → verify (OAuth at `verify.base.dev` in live mode, or link a handle in sandbox) → sign a SIWE message with `urn:verify:provider/...` trait requirements → claim. The backend re-validates trait requirements (frontend tampering protection), verifies the signature (EOA + smart wallets via ERC-6492), and enforces token uniqueness.

By default it runs a **sandbox verifier** — account stats and tokens are derived deterministically from the linked handle. For the live API, set server-only env vars (access via Base interest form):

```env
BASE_VERIFY_API_URL=https://verify.base.dev/v1
BASE_VERIFY_SECRET_KEY=...
```

Demo claims are stored in-memory (reset on server restart). Code lives in `src/lib/verifyDrop/`, `src/app/api/verify-drop/`, and `src/components/VerifyDropPanel.tsx`. Deep link: `/?tab=drop`.

## Swap (0x on Base)

The **Swap** tab routes trades through the [0x aggregator](https://docs.0x.org) (Uniswap, Aerodrome, etc. on Base).

1) Get a free API key — start at [0x Quickstart](https://docs.0x.org/docs/introduction/quickstart/getting-started).

2) Add to `.env.local` / Vercel:

```env
ZEROX_API_KEY=your_key_here
```

Users connect wallet, pick tokens (ETH, USDC, WETH, DEGEN, or custom address), approve if needed, then sign the swap. Builder Code applies via wagmi `dataSuffix`.

## Game — Grid 6×6 (1v1, onchain)

**Game** tab: 6×6 board, **four in a row** to win (free placement — extended tic-tac-toe / m,n,k-game). No game server; each move is a Base transaction. Winner takes both stakes (draw = refund).

1) Compile and deploy:

```bash
npm run contract:compile:hardhat
npm run contract:deploy:grid646
```

2) Add to `.env.local` / Vercel:

```env
NEXT_PUBLIC_GRID646_ADDRESS=0x...
```

3) Flow: **Create game** (stake ETH, you are X) → share **Game ID** → opponent **Join** (O) → tap cells to `play(row,col)`.

Stakes: `MIN_STAKE`–`MAX_STAKE` on contract (default 0.00001–0.05 ETH). Open games can be cancelled after `JOIN_TIMEOUT` if nobody joins.

## Game — Battleship 10×10 (1v1, onchain)

**Battleship** tab: classic Hasbro fleet (5+4+3+3+2) on a 10×10 grid. Place your fleet on-chain, then alternate shots. Hit = extra turn. Casual (0 ETH) or ranked stakes — same model as Grid646.

1) Compile and deploy:

```bash
npm run contract:compile:hardhat
npm run contract:deploy:battleship10
```

2) Add to `.env.local` / Vercel:

```env
NEXT_PUBLIC_BATTLESHIP10_ADDRESS=0x...
```

3) Flow: **Create room** → share **Game ID** → opponent **Join** → both **Confirm fleet** → tap enemy grid to **Fire**.

Note: ship layouts are stored on-chain (UI hides opponent fleet during battle; advanced users could read storage — same trust model as casual onchain games).

Local QA (gitignored `scripts/local/`):

```bash
node scripts/local/run-battleship10-games.js --dry-run
node scripts/local/run-battleship10-games.js --skip-fund --matches 0
```

## Notes

- This project is migrated away from Farcaster mini-app SDK flow.
- For Base App readiness, keep metadata and builder settings updated in Base.dev.
- Agent discovery: `/.well-known/SKILL.md` documents read APIs and deep links (`/?tab=score&address=0x…`).
- Base App embed mode auto-compacts nav when opened inside the mini-app shell (`isBaseAppEmbed`).
- Builder Code is applied in code via wagmi `dataSuffix` inside `src/lib/wagmiConfig.ts` and read from `NEXT_PUBLIC_BASE_BUILDER_CODE`.
