/**
 * Capture Base.dev listing assets from production (or PLAYWRIGHT_BASE_URL).
 * Output: docs/base-dev-assets/*.png + manifest.json
 *
 *   node scripts/capture-base-dev-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? "https://app-base-os.vercel.app").replace(/\/$/, "");
const OUT_DIR = path.join(import.meta.dirname, "..", "docs", "base-dev-assets");
const SCORE_DEMO = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

const TAGLINE = "Your Base command center";
const DESCRIPTION =
  "Base OS: tips, onchain score, analytics, ERC-20 launch, Grid 6×6 game, swap, identity cards, app radar & token guard — one toolkit on Base.";

const SHOTS = [
  { id: "01-home", url: `${BASE_URL}/?tab=home`, waitMs: 2500 },
  { id: "03-game", url: `${BASE_URL}/?tab=game`, waitMs: 3000 },
  { id: "04-launch", url: `${BASE_URL}/?tab=launch`, waitMs: 2500 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const iphone = devices["iPhone 14 Pro Max"];
const browser = await chromium.launch();
const context = await browser.newContext({
  ...iphone,
  locale: "en-US",
  colorScheme: "dark",
});
const page = await context.newPage();

async function shot(id, url, waitMs = 2000) {
  console.log(`Capture ${id}: ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(waitMs);
  const file = path.join(OUT_DIR, `${id}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  → ${file}`);
  return file;
}

for (const s of SHOTS) {
  await shot(s.id, s.url, s.waitMs);
}

console.log(`Capture 02-score: ${BASE_URL}/?tab=score`);
await page.goto(`${BASE_URL}/?tab=score`, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForTimeout(1500);
const input = page.locator('input[placeholder*="0x"]');
await input.fill(SCORE_DEMO);
await page.getByRole("button", { name: "Analyze" }).click();
await page.waitForSelector("text=Grade", { timeout: 60_000 }).catch(() => null);
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.querySelectorAll("input, .font-mono").forEach((el) => {
    if (el instanceof HTMLElement) el.style.filter = "blur(6px)";
  });
});
const scoreFile = path.join(OUT_DIR, "02-score.png");
await page.screenshot({ path: scoreFile, fullPage: false });
console.log(`  → ${scoreFile}`);

await browser.close();

const manifest = {
  appId: "69f884af879b4ae3fa1c7162",
  appUrl: "https://app-base-os.vercel.app",
  tagline: TAGLINE,
  description: DESCRIPTION,
  builderCode: "bc_59omft8w",
  capturedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  assets: {
    icon: "app-icon-base-os-512.png",
    screenshots: ["01-home.png", "02-score.png", "03-game.png", "04-launch.png"],
  },
};

fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Manifest: ${path.join(OUT_DIR, "manifest.json")}`);
