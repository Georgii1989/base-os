# Georgiy Base Tip Jar

Standard web app for Base App migration:
- wallet connection with `wagmi`,
- SIWE sign-in flow (`viem/siwe`),
- onchain tip transaction to a configurable recipient,
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

3) Set your tip recipient:

```env
NEXT_PUBLIC_TIP_RECIPIENT=0xYourWalletAddressOnBase
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

5) Optional verification:

```bash
npx hardhat verify --network base <DEPLOYED_CONTRACT_ADDRESS> <TIPJAR_OWNER_ADDRESS>
```

## Notes

- This project is migrated away from Farcaster mini-app SDK flow.
- For Base App readiness, keep metadata and builder settings updated in Base.dev.
