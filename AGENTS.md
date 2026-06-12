<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

**Product:** Single Next.js 16 app ("Base OS") — a Base blockchain toolkit (tips, swap, launch, onchain games, analytics, portfolio, safety). There is no docker-compose, database, or local chain; onchain features talk to **Base mainnet** via public RPC.

**Env file:** Copy `cp .env.example .env.local` (gitignored). The defaults in `.env.example` point at already-deployed Base contracts and work for local dev with no secrets. The app also runs without `.env.local`; missing-key features degrade gracefully.

**Run / build (see `README.md` + `package.json`):** `npm run dev` → http://localhost:3000 (Turbopack). `npm run build` + `npm run start` for production.

**Lint / test:** `npm run lint` currently reports **pre-existing** ESLint errors (e.g. `react-hooks/set-state-in-effect` in `SwapTokenSelectModal.tsx`, `prefer-const` in `battleship10Logic.ts`) — these are in committed code, not an environment problem. `npm test` (Vitest, 75 tests) and `npm run build` pass clean.

**E2E:** `npm run test:e2e:install` once to fetch Chromium, then `npm run test:e2e`. If a dev/prod server is already running, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` so Playwright skips its own `build && start` webServer.

**Optional API keys** (app loads without them): `ZEROX_API_KEY` (swap quotes), Blockscout/Basescan/Etherscan keys for higher rate limits.

**Contract tooling (not needed to run the web app):** Hardhat/deploy scripts read `contracts.local.env` (from `contracts.env.example`), NOT `.env.local`. Deploys target Base mainnet and need a funded `DEPLOYER_PRIVATE_KEY`.

**No-wallet hello-world check:** Load `/`, open the Analytics tab (it loads live Base TVL/volume from DeFi Llama, L2BEAT, Blockscout), or hit `GET /api/analytics/base?source=defillama` for JSON.
