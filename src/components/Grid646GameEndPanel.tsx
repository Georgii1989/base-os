"use client";

import { useCallback, useEffect, useState } from "react";
import type { Grid646GameView } from "@/lib/grid646";
import { shortenAddr } from "@/lib/grid646";
import {
  loadRematchVote,
  saveRematchVote,
  type RematchVote,
} from "@/lib/grid646Rematch";
import { hasPlayerO, isGameDraw, winnerMark } from "@/lib/grid646Rooms";

type Props = {
  game: Grid646GameView;
  myRole: "X" | "O" | null;
  address: string | undefined;
  isBusy: boolean;
  onLeave: () => void;
  onCreateRematch: () => void;
};

type ApiVotes = { x?: RematchVote; o?: RematchVote };

export function Grid646GameEndPanel({
  game,
  myRole,
  address,
  isBusy,
  onLeave,
  onCreateRematch,
}: Props) {
  const [myVote, setMyVote] = useState<RematchVote | null>(null);
  const [opponentVote, setOpponentVote] = useState<RematchVote | null>(null);

  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/grid646/rematch?gameId=${String(game.gameId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ApiVotes;
      if (myRole === "X") setOpponentVote(data.o ?? null);
      else if (myRole === "O") setOpponentVote(data.x ?? null);
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
    if (!address || !myRole) return;
    saveRematchVote(game.gameId, address, vote);
    setMyVote(vote);
    try {
      await fetch("/api/grid646/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: String(game.gameId),
          role: myRole,
          vote,
        }),
      });
      await fetchVotes();
    } catch {
      /* local vote still saved */
    }
    if (vote === "no") onLeave();
  }

  const mark = winnerMark(game);
  const draw = isGameDraw(game);
  const bothYes = myVote === "yes" && opponentVote === "yes";
  const canCreateRematch = bothYes && myRole === "X";

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
          <p className="text-sm font-black text-violet-100">Play another round?</p>
          <p className="mt-1 text-xs text-violet-200/75">
            Both players tap Yes on their phones. Host then creates a new room.
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

          {myVote === "yes" && opponentVote !== "yes" ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Waiting for opponent to tap Yes in this finished room.
            </p>
          ) : null}

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

          {myVote === "yes" && myRole === "O" && bothYes ? (
            <p className="mt-2 text-xs text-cyan-200/90">
              Host is creating a rematch — check <strong>Open rooms</strong> or enter the new room
              number.
            </p>
          ) : null}

          {myVote === "yes" && myRole === "O" && opponentVote !== "yes" && hasPlayerO(game.playerO) ? (
            <p className="mt-2 text-xs text-slate-500">
              Ask {shortenAddr(game.playerX)} to open room #{String(game.gameId)} and tap Yes.
            </p>
          ) : null}
        </div>
      ) : null}

      {!myRole && (
        <p className="text-center text-xs text-slate-500">
          {draw ? "Draw." : mark ? `${mark} won.` : "Game ended."} Leave room to return to the lobby.
        </p>
      )}
    </div>
  );
}
