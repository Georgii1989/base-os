# Base Builder Tip Jar

Standard web app for Base App migration:
- wallet connection with `wagmi`,
- SIWE sign-in flow (`viem/siwe`),
- onchain tip transaction to a configurable recipient.

## Stack

- Next.js 16 (App Router)
- wagmi + viem
- @base-org/account connector
- React Query

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

## Notes

- This project is migrated away from Farcaster mini-app SDK flow.
- For Base App readiness, keep metadata and builder settings updated in Base.dev.
