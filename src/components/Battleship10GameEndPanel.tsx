"use client";

import { useCallback, useEffect, useState } from "react";
import type { Battleship10GameView } from "@/lib/battleship10";
import { shortenAddr } from "@/lib/battleship10";
import { hasPlayerO } from "@/lib/battleship10Rooms";
import {
  loadRematchVote,
  saveRematchVote,
  type RematchVote,
} from "@/lib/battleship10Rematch";

type Props = {
  game: Battleship10GameView;
  myRole: "host" | "guest" | null;
  address: string | undefined;
  isBusy: boolean;
  onLeave: () => void;
  onCreateRematch: () => void;
};

type ApiVotes = { x?: RematchVote; o?: RematchVote };

export function Battleship10GameEndPanel({
  game,
  myRole,
  address,
  isBusy,
  onLeave,
  onCreateRematch,
}: Props) {
  const [myVote, setMyVote] = useState<RematchVote | null>(null);
  const [opponentVote, setOpponentVote] = useState<RematchVote | null>(null);

  const apiRole = myRole === "host" ? "X" : myRole === "guest" ? "O" : null;

  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/battleship10/rematch?gameId=${String(game.gameId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ApiVotes;
      if (myRole === "host") setOpponentVote(data.o ?? null);
      else if (myRole === "guest") setOpponentVote(data.x ?? null);
    } catch {
      /* ignore */
    }
  }, [game.gameId, myRole]);

  useEffect(() => {
    if (!address) return;
    setMyVote(loadRematchVote(game.gameId, address));
    void fetchVotes();
    const t = setInterval(() => void fetchVotes(), 2000);
    return () => clearInterval(t);
  }, [game.gameId, address, fetchVotes]);

  async function castVote(vote: RematchVote) {
    if (!address || !apiRole) return;
    saveRematchVote(game.gameId, address, vote);
    setMyVote(vote);
    try {
      await fetch("/api/battleship10/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: String(game.gameId),
          role: apiRole,
          vote,
        }),
      });
      await fetchVotes();
    } catch {
      /* local vote saved */
    }
    if (vote === "no") onLeave();
  }

  const bothYes = myVote === "yes" && opponentVote === "yes";
  const canCreateRematch = bothYes && myRole === "host";
  const iWon =
    address != null && game.winner.toLowerCase() === address.toLowerCase();

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onLeave}
        className="w-full rounded-xl border border-white/20 bg-white/5 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10"
      >
        Leave room
      </button>

      {myRole ? (
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4">
          <p className="text-sm font-black text-violet-100">
            {iWon ? "You sank their fleet!" : "Fleet lost — good fight."}
          </p>
          <p className="mt-1 text-xs text-violet-200/75">
            Both players tap Yes for a rematch. Host creates the new room.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isBusy || myVote != null}
              onClick={() => void castVote("yes")}
              className="flex-1 rounded-lg bg-emerald-600/50 py-2.5 text-xs font-black text-white disabled:opacity-50"
            >
              Yes
            </button>
            <button
              type="button"
              disabled={isBusy || myVote != null}
              onClick={() => void castVote("no")}
              className="flex-1 rounded-lg border border-white/15 py-2.5 text-xs font-black text-slate-300 disabled:opacity-50"
            >
              No
            </button>
          </div>

          <ul className="mt-3 space-y-1 text-xs text-slate-400">
            <li>
              You:{" "}
              <span className="font-bold text-white">
                {myVote === "yes" ? "Yes" : myVote === "no" ? "No" : "—"}
              </span>
            </li>
            <li>
              Opponent:{" "}
              <span className="font-bold text-white">
                {opponentVote === "yes" ? "Yes" : opponentVote === "no" ? "No" : "waiting…"}
              </span>
            </li>
          </ul>

          {canCreateRematch ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={onCreateRematch}
              className="mt-3 w-full rounded-xl bg-fuchsia-600/70 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              Create rematch room (host)
            </button>
          ) : null}

          {myVote === "yes" && myRole === "guest" && bothYes ? (
            <p className="mt-2 text-xs text-cyan-200/90">Host is creating a rematch room…</p>
          ) : null}

          {myVote === "yes" && myRole === "guest" && opponentVote !== "yes" && hasPlayerO(game.playerO) ? (
            <p className="mt-2 text-xs text-slate-500">
              Ask {shortenAddr(game.playerX)} to open this room and tap Yes.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
