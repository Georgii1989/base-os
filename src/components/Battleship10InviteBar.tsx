"use client";

import { useState } from "react";
import { buildBattleshipInviteUrl, copyBattleshipInvite } from "@/lib/battleship10Invite";

export function Battleship10InviteBar({ gameId }: { gameId: bigint }) {
  const [copied, setCopied] = useState(false);
  const url = buildBattleshipInviteUrl(gameId);

  async function handleCopy() {
    const ok = await copyBattleshipInvite(gameId);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
      <p className="text-sm font-bold text-cyan-100">
        Invite link — room <span className="font-mono text-lg">#{String(gameId)}</span>
      </p>
      <p className="mt-1 break-all font-mono text-[10px] text-cyan-200/70">{url}</p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 w-full rounded-xl border border-cyan-300/40 bg-cyan-600/30 py-2.5 text-xs font-black text-cyan-50"
      >
        {copied ? "Copied!" : "Copy invite link"}
      </button>
    </div>
  );
}
