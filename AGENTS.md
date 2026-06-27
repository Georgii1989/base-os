<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

**Product:** Single Next.js 16 (App Router, Turbopack) app — "Base OS", a Base blockchain toolkit (tips, swap, token launch, onchain games, analytics, portfolio, safety). There is no docker-compose, database, or local chain; onchain features talk to **Base mainnet** via public RPC, and analytics/portfolio pull live data from public APIs (DeFi Llama, L2BEAT, Blockscout). Standard commands live in `README.md` and `package.json`.

**Env file:** The update script copies `.env.example` → `.env.local` (gitignored) only if it does not already exist. Defaults point at already-deployed Base contracts and work for local dev with no secrets; the app also runs without `.env.local` (missing-key features degrade gracefully). Do not commit `.env.local`.

**Run:** `npm run dev` → http://localhost:3000. Tabs are deep-linkable via `?tab=` (e.g. `/?tab=analytics`, `/?tab=portfolio`). The Analytics tab is the best no-wallet hello-world: it loads live Base TVL/volume/tx stats and lets you switch sources; `GET /api/analytics/base?source=defillama|l2beat|blockscout` returns the same data as JSON.

**Lint:** `npm run lint` reports **pre-existing** errors in committed code (e.g. `react-hooks/set-state-in-effect`, `prefer-const` in `battleship10Logic.ts`) — these are not an environment problem; do not treat a non-zero lint exit as a setup failure.

**Test / build:** `npm test` (Vitest, node env, only `src/**/*.test.ts`) and `npm run build` pass clean. E2E uses Playwright: run `npm run test:e2e:install` once to fetch Chromium, then `npm run test:e2e`. If a dev/prod server is already running, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` so Playwright skips its own `build && start` webServer.

**Contract tooling (not needed to run the web app):** Hardhat/deploy scripts read `contracts.local.env` (from `contracts.env.example`), NOT `.env.local`. Deploys target Base mainnet and need a funded `DEPLOYER_PRIVATE_KEY`. `npm run contract:compile:hardhat` may fail with `HH502` if it cannot download the solc metadata; use `npm run contract:compile` (local `solc`) instead.
