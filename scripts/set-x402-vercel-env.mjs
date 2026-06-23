/**
 * Set x402 CDP env vars on Vercel from cdp_api_key.json.
 * Usage: node scripts/set-x402-vercel-env.mjs [path-to-json]
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const defaultPaths = [
  "C:/Users/Георгий/Desktop/cdp_api_key.json",
  "C:/Users/Георгий/Desktop/cdp_api_key",
  resolve("cdp_api_key.json"),
];

const keyPath = process.argv[2] ?? defaultPaths.find((p) => existsSync(p));
if (!keyPath || !existsSync(keyPath)) {
  console.error("cdp_api_key.json not found. Pass path as first argument.");
  process.exit(1);
}

const j = JSON.parse(readFileSync(keyPath, "utf8"));
const id = j.id?.trim();
const secret = (j.privateKey ?? j.apiKeySecret ?? j.secret)?.trim();
if (!id || !secret) {
  console.error("JSON must contain id and privateKey");
  process.exit(1);
}

const payTo = process.env.X402_PAY_TO_ADDRESS?.trim() || "0x8655520b4b19187038aC9a4f560da0979Cc1E95C";
const vars = [
  ["CDP_API_KEY_ID", id, true],
  ["CDP_API_KEY_SECRET", secret, true],
  ["X402_PAY_TO_ADDRESS", payTo, false],
  ["X402_SCORE_PRICE", "$0.001", false],
];

for (const env of ["production", "preview", "development"]) {
  for (const [name, value, sensitive] of vars) {
    const args = ["vercel", "env", "update", name, env, "--yes"];
    if (sensitive) args.push("--sensitive");
    const r = spawnSync("npx", args, {
      input: value,
      encoding: "utf8",
      cwd: process.cwd(),
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (r.status !== 0) {
      const addArgs = ["vercel", "env", "add", name, env, "--force", "--yes"];
      if (sensitive) addArgs.push("--sensitive");
      const add = spawnSync("npx", addArgs, {
        input: value,
        encoding: "utf8",
        cwd: process.cwd(),
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (add.status !== 0) {
        console.error(`Failed ${name}@${env}:`, add.stderr || add.stdout);
        process.exit(1);
      }
    }
    console.log(`OK ${name}@${env}`);
  }
}

console.log("Done. Redeploy production to apply.");
