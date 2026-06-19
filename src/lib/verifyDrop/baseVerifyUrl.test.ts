import { describe, expect, it } from "vitest";
import { buildVerifyRedirectUrl } from "@/lib/verifyDrop/baseVerifyUrl";

describe("buildVerifyRedirectUrl", () => {
  it("builds verify.base.dev redirect with provider", () => {
    const url = buildVerifyRedirectUrl("https://app-base-os.vercel.app/?tab=drop", "x");
    expect(url).toBe(
      "https://verify.base.dev/?redirect_uri=https%3A%2F%2Fapp-base-os.vercel.app%2F%3Ftab%3Ddrop&providers=x"
    );
  });
});
