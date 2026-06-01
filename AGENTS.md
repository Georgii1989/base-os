<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

**Product:** Single Next.js 16 app (“Base OS”) — Base blockchain toolkit (tips, swap, launch, games, analytics, portfolio, etc.). No docker-compose, database, or local chain; onchain features talk to **Base mainnet** via public RPC.

**First-time env (not in the VM update script):** After `npm install`, copy `cp .env.example .env.local` (gitignored). Defaults in `.env.example` point at deployed Base contracts and work for local dev without secrets.

**Run the app:** `npm run dev` → http://127.0.0.1:3000. Tabs use `?tab=` (e.g. `/?tab=analytics`, `/?tab=portfolio`). Production: `npm run build` then `npm run start`.

**Lint / test / build:** See `README.md` and `package.json`. `npm run lint` currently reports pre-existing ESLint errors (mostly `react-hooks/set-state-in-effect`); `npm run test` (Vitest) and `npm run build` pass. E2E: `npm run test:e2e:install` once, then `npm run test:e2e`. With a dev server already running, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` so Playwright skips its own `build && start` webServer.

**Optional API keys** (app loads without them): `ZEROX_API_KEY` (swap quotes), `RELAY_API_KEY`, `COINMARKETCAP_API_KEY`, Blockscout/Etherscan keys for higher rate limits.

**Contract tooling:** Hardhat deploy scripts use `contracts.local.env` (from `contracts.env.example`), not `.env.local`. Not required to run the web app.

**Hello-world check without a wallet:** Load `/`, open Analytics (`?tab=analytics`) and confirm charts/sources load; hit `GET /api/analytics/base?source=defillama` for JSON. Portfolio tab (`?tab=portfolio`) should show “Base portfolio”.
