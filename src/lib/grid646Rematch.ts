export type RematchVote = "yes" | "no";

function voteKey(gameId: bigint, address: string): string {
  return `grid646-rematch-vote-${String(gameId)}-${address.toLowerCase()}`;
}

export function loadRematchVote(gameId: bigint, address: string | undefined): RematchVote | null {
  if (typeof window === "undefined" || !address) return null;
  const raw = localStorage.getItem(voteKey(gameId, address));
  return raw === "yes" || raw === "no" ? raw : null;
}

export function saveRematchVote(gameId: bigint, address: string, vote: RematchVote): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(voteKey(gameId, address), vote);
}

export function clearRematchVotes(gameId: bigint, playerX: string, playerO: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(voteKey(gameId, playerX));
  if (playerO) localStorage.removeItem(voteKey(gameId, playerO));
}
