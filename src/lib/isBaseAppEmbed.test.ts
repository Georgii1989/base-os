import { describe, expect, it } from "vitest";
import { isBaseAppEmbed } from "@/lib/isBaseAppEmbed";

describe("isBaseAppEmbed", () => {
  it("returns false when window is undefined", () => {
    const prev = globalThis.window;
    // @ts-expect-error test SSR
    delete globalThis.window;
    expect(isBaseAppEmbed()).toBe(false);
    globalThis.window = prev;
  });
});
