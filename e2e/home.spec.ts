import { expect, test } from "@playwright/test";

test.describe("Base OS shell", () => {
  test("home loads with briefing and grouped nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Base OS/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Home/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Swap/i })).toBeVisible();
  });

  test("portfolio tab renders", async ({ page }) => {
    await page.goto("/?tab=portfolio");
    await expect(page.getByRole("heading", { name: /Base portfolio/i })).toBeVisible();
  });

  test("launch kit wizard starts", async ({ page }) => {
    await page.goto("/?tab=launch");
    await expect(page.getByRole("heading", { name: /Create your token on Base/i })).toBeVisible();
    await page.getByRole("button", { name: /Start wizard/i }).click();
    await expect(page.getByRole("heading", { name: /Token identity/i })).toBeVisible();
  });

  test("robots.txt is served", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body.toLowerCase()).toContain("user-agent");
  });
});
