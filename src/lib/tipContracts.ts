/** TipWithBadgeRouter on Base — tips + soulbound badge mint. */
export const DEFAULT_TIPJAR_ROUTER = "0xDd1090aFba3117953B892A6390B18abe5A979894" as const;

export function resolveTipJarAddress(): `0x${string}` {
  const env = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS?.trim();
  if (env && /^0x[a-fA-F0-9]{40}$/.test(env)) {
    return env as `0x${string}`;
  }
  return DEFAULT_TIPJAR_ROUTER;
}
