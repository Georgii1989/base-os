# Base.dev dashboard — App-Base-OS (`69f884af879b4ae3fa1c7162`)

Copy-paste for **Settings → App Information** and related tabs.

**Live app:** https://app-base-os.vercel.app

---

## App Information

### Tagline (max 30 characters)

```
Your Base command center
```

(25 chars)

**Alternative (27):** `Tips, score & launch on Base`

### Description (max 180 characters)

```
Base OS: tips, onchain score, analytics, ERC-20 launch, Grid 6×6 game, swap, identity cards, app radar & token guard — one toolkit on Base.
```

(143 chars)

**Alternative (179):**  
`All-in-one Base toolkit: tip creators, score any wallet, DeFi charts, onchain Grid 6×6, Launch Token, public /card pages, app radar, watchlist & approvals.`

### App icon

Upload: `public/app-icon-base-os.svg`  
If the dashboard requires **PNG** (512×512): export the SVG in Figma / Photopea / https://svgtopng.com → `app-icon-base-os.png`.

### App screenshots (3–4 recommended)

Capture from **production** (portrait phone or cropped desktop, clear UI):

| # | URL | What to show |
|---|-----|----------------|
| 1 | `/?tab=home` | Home hub — Base pulse + module grid |
| 2 | `/?tab=score` | Onchain score + breakdown after Analyze |
| 3 | `/?tab=game` | Grid 6×6 — lobby, casual/ranked toggle, room list |
| 4 | `/?tab=launch` | Launch Token form or success with contract address |

**Tips:** hide browser bookmarks bar; use dark theme as in app; optional 5th: `/?tab=analytics` charts.

Typical size: **1290×2796** (iPhone) or **1080×1920** — check current Base dashboard hint.

**Score screenshot:** use `assets/onchain-score-screenshot-blurred.png` if you need a pre-blurred export (addresses hidden).

---

## Builder Codes

**Settings → Builder Codes**

- Code in repo: `bc_59omft8w` (`NEXT_PUBLIC_BASE_BUILDER_CODE`)
- Must match the code claimed on this app in base.dev
- Payout wallet: your main builder wallet

---

## Configuration (checklist)

- **App URL / domain:** `https://app-base-os.vercel.app`
- **Allowed origins:** same URL (and localhost for dev if needed)
- **Mini app / embed:** enabled if you publish inside Base App
- **Category:** Developer Tools / Analytics / Social (pick closest; “Utilities” also fine)

---

## Onchain contracts (for review / transparency)

| Feature | Env var | Base address |
|---------|---------|--------------|
| Tips + badge router | `NEXT_PUBLIC_TIPJAR_ADDRESS` | `0xDd1090aFba3117953B892A6390B18abe5A979894` |
| Soulbound badge | `NEXT_PUBLIC_SBT_ADDRESS` | `0x3736b7A4fC567192AA359CaDd8407786C556F729` |
| Token factory | `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS` | `0x4B7057Db4AE4914602faF5718E067BBe5920ff62` |
| Grid 6×6 game (v3 — casual idle close) | `NEXT_PUBLIC_GRID646_ADDRESS` | `0xE18cAe98DeF2189a2B57F8052B049247773b894f` |

Previous Grid646 (`0xc5c1…C628`) — v2, no `closeCasualIdleGame`. Production uses v3 after deploy.

---

## Optional polish

- **Members:** add teammates who can edit the listing
- **Notifications:** enable deploy / review emails if offered

---

## Russian summary (для себя)

| Поле | Значение |
|------|----------|
| Tagline | Your Base command center |
| Description | см. блок выше (англ., с Grid 6×6) |
| Icon | `public/app-icon-base-os.svg` |
| Screenshots | Home, Score, **Game**, Launch с прода |
| Grid646 v3 | `0xE18cAe98DeF2189a2B57F8052B049247773b894f` |

После сохранения подожди ревью Base App / leaderboard — тексты должны отражать реальный продукт (score, launch, analytics, **game** уже live).

---

## Local QA fleet (20 wallets) — **не в GitHub**

Скрипты и ключи лежат только в `scripts/local/` (gitignored):

```bash
node scripts/local/generate-wallets.js   # 20 test wallets → wallets.json
node scripts/local/run-grid646-games.js    # casual 1v1 scenarios
```

См. `scripts/local/README.md`. Никогда не коммитить `wallets.json`, `secrets.local.env`.
