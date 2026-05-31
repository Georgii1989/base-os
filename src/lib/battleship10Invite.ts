export function buildBattleshipInviteUrl(gameId: bigint, appOrigin?: string): string {
  const base = (appOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app-base-os.vercel.app").replace(
    /\/$/,
    ""
  );
  return `${base}/?tab=battleship&join=${String(gameId)}`;
}

export async function copyBattleshipInvite(gameId: bigint): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(buildBattleshipInviteUrl(gameId));
    return true;
  } catch {
    return false;
  }
}
