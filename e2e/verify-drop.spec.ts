import { expect, test } from "@playwright/test";

test.describe("Base Verify tab", () => {
  test("tab renders the claim panel and feed", async ({ page }) => {
    await page.goto("/?tab=drop");
    await expect(page.getByRole("heading", { name: /Sybil-resistant claim/i })).toBeVisible();
    await expect(page.getByText(/Sandbox verifier/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Claim feed/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Base Verify/i })).toBeVisible();
  });

  test("claims API responds with verify config", async ({ request }) => {
    const res = await request.get("/api/verify-drop/claims");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      mode: string;
      action: string;
      providers: Array<{ id: string }>;
    };
    expect(["sandbox", "live"]).toContain(body.mode);
    expect(body.action).toBe("claim_base_os_verify");
    expect(body.providers.map((p) => p.id)).toEqual(["x", "coinbase", "instagram", "tiktok"]);
  });

  test("claim API rejects malformed requests", async ({ request }) => {
    const res = await request.post("/api/verify-drop/claim", {
      data: { message: "not-siwe", signature: "0x1234" },
    });
    expect(res.status()).toBe(400);
  });
});
