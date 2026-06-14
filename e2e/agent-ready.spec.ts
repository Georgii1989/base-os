import { expect, test } from "@playwright/test";

const SAMPLE_ADDRESS = "0x8655520b4b19187038aC9a4f560da0979Cc1E95C";

test.describe("Agent discovery", () => {
  test("SKILL.md is served at well-known path", async ({ request }) => {
    const res = await request.get("/.well-known/SKILL.md");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("Base OS");
    expect(body).toContain("/api/onchain-score");
    expect(body).toContain("tab=score&address=");
  });

  test("OpenAPI spec is served", async ({ request }) => {
    const res = await request.get("/.well-known/openapi.json");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(body.openapi).toMatch(/^3\./);
    expect(body.paths["/api/onchain-score"]).toBeDefined();
    expect(body.paths["/api/portfolio/{address}"]).toBeDefined();
  });
});

test.describe("Deep links", () => {
  test("score tab with address auto-opens analyze UI", async ({ page }) => {
    await page.goto(`/?tab=score&address=${SAMPLE_ADDRESS}`);
    await expect(page.getByRole("heading", { name: /Onchain score/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Analyze/i })).toBeVisible();
    const input = page.locator('input[placeholder*="0x"]');
    await expect(input).toHaveValue(new RegExp(SAMPLE_ADDRESS.slice(2, 8), "i"));
  });

  test("portfolio tab with address prefills lookup", async ({ page }) => {
    await page.goto(`/?tab=portfolio&address=${SAMPLE_ADDRESS}`);
    await expect(page.getByRole("heading", { name: /Base portfolio/i })).toBeVisible();
    const input = page.getByPlaceholder("0x…");
    await expect(input).toHaveValue(new RegExp(SAMPLE_ADDRESS.slice(2, 8), "i"));
  });

  test("guard tab with address shows deep link banner", async ({ page }) => {
    await page.goto(`/?tab=guard&address=${SAMPLE_ADDRESS}`);
    await expect(page.getByRole("heading", { name: /Wallet guard/i })).toBeVisible();
    await expect(page.getByText(/Deep link wallet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Bulk review on revoke\.cash/i })).toBeVisible();
  });

  test("score deep link sets OG title", async ({ page }) => {
    await page.goto(`/?tab=score&address=${SAMPLE_ADDRESS}`);
    await expect(page).toHaveTitle(/Onchain score/i);
  });
});
