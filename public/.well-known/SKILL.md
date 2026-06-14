# Base OS

Base OS is an onchain command center for the Base network (chain ID 8453). Agents can query wallet intelligence, open deep-linked UI modules, and share links that unfurl inside Base App.

**Production URL:** https://app-base-os.vercel.app  
**Base App listing ID:** `69f884af879b4ae3fa1c7162`  
**Chain:** Base mainnet (`8453`)

## Capabilities

| Capability | Type | Description |
|------------|------|-------------|
| Onchain score | read | Heuristic activity score for any Base address |
| Portfolio | read | ETH + ERC-20 balances on Base |
| Project radar | read | Curated Base ecosystem apps with market data |
| Base analytics | read | TVL, fees, stablecoin, DEX volume aggregates |
| Watchlist stats | read | Aggregate stats for tracked wallets |
| Badge holders | read | Public supporter badge mint list |
| Verify drop claims | read | Sandbox/live drop claim feed |
| Deep links | action | Open a specific module in the web UI |

## Authentication

Public read endpoints require no API key. Onchain actions (swap, tip, games) happen in the user wallet via the web UI — agents should share deep links, not hold keys.

## API — Onchain score

**GET** `/api/onchain-score?address={0xAddress}`

Returns JSON:

```json
{
  "address": "0x…",
  "isContract": false,
  "balanceWei": "…",
  "rpcTxCount": 42,
  "score": { "score": 85, "grade": "B" },
  "source": "blockscout",
  "topProtocols": []
}
```

Errors: `400` missing/invalid address, `502` upstream fetch failed.

**Example**

```bash
curl "https://app-base-os.vercel.app/api/onchain-score?address=0x8655520b4b19187038aC9a4f560da0979Cc1E95C"
```

## API — Portfolio

**GET** `/api/portfolio/{address}`

ETH and ERC-20 holdings on Base (spam tokens filtered).

## API — Radar

**GET** `/api/radar`

Curated Base projects with optional live DEX prices.

## API — Base analytics

**GET** `/api/analytics/base?source=defillama`

Aggregated Base chain metrics.

## API — Verify drop (demo)

**GET** `/api/verify-drop/claims`

Drop config, providers, and in-memory claim feed (`mode`: `sandbox` or `live`).

## Deep links

Open modules directly. Pass `tab` and optional params:

| URL | Opens |
|-----|-------|
| `/?tab=home` | Briefing hub |
| `/?tab=score&address=0x…` | Onchain score — auto-analyzes address (rich OG preview) |
| `/?tab=portfolio&address=0x…` | Portfolio for any address |
| `/?tab=guard&address=0x…` | Token guard deep link + revoke.cash for target wallet |
| `/?tab=portfolio` | Connected wallet portfolio |
| `/?tab=swap` | Swap & bridge |
| `/?tab=game&room=12` | Grid 6×6 — join room 12 |
| `/?tab=battleship&room=7` | Battleship 10×10 — join room 7 |
| `/?tab=drop` | Verify-style claim demo |
| `/?tab=analytics` | Base TVL charts |
| `/?tab=radar` | Project radar |
| `/card/{address}` | Shareable identity card |
| `/{address}` | Public tip page |

**Agent pattern — check a wallet**

1. `GET /api/onchain-score?address=0x…`
2. Summarize score, grade, deployments, bridge activity
3. Share `https://app-base-os.vercel.app/?tab=score&address=0x…` for rich UI

## Machine-readable spec

**OpenAPI 3.1:** `/.well-known/openapi.json`  
**Skill file:** `/.well-known/SKILL.md` (this document)

## Base App embed

When opened inside Base App, Base OS auto-detects the embed context and prefers the Base Account wallet connector. Compact navigation shows: Home, Score, Portfolio, Swap, Games, Tips.

## Side effects

| Endpoint / action | Side effect |
|-------------------|-------------|
| GET APIs above | None — read only |
| UI: tip, swap, games | Onchain tx — user must approve in wallet |
| POST `/api/verify-drop/claim` | Records demo claim (in-memory) |

## Errors

Return descriptive JSON: `{ "error": "code", "message": "human readable" }`. Agents should surface `message` to users.

## Version

Skill spec: 1.1 — Base OS `0.1.0`
