"use client";

import { useEffect, useRef } from "react";
import { base } from "wagmi/chains";
import { useWriteContract } from "wagmi";
import { BATTLESHIP10_ABI } from "@/lib/battleship10Abi";
import type { Battleship10GameView } from "@/lib/battleship10";
import { canCloseCasualIdle } from "@/lib/battleship10Timeouts";

/** Permissionless on-chain cleanup for stale casual rooms (after CASUAL_INACTIVITY_TIMEOUT). */
export function useBattleship10IdleCloser(
  contract: `0x${string}` | undefined,
  liveRooms: readonly Battleship10GameView[],
  nowSec: number,
  enabled: boolean,
  onClosed?: () => void
) {
  const { writeContractAsync } = useWriteContract();
  const closingRef = useRef<Set<string>>(new Set());
  const closedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!contract || !enabled) return;

    const eligible = liveRooms.filter((g) => canCloseCasualIdle(g, nowSec));
    if (eligible.length === 0) return;

    let cancelled = false;

    (async () => {
      for (const game of eligible) {
        if (cancelled) break;
        const id = game.gameId.toString();
        if (closedRef.current.has(id) || closingRef.current.has(id)) continue;
        closingRef.current.add(id);
        try {
          await writeContractAsync({
            address: contract,
            abi: BATTLESHIP10_ABI,
            functionName: "closeCasualIdleGame",
            args: [game.gameId],
            chainId: base.id,
          });
          closedRef.current.add(id);
          onClosed?.();
        } catch {
          closingRef.current.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contract, enabled, liveRooms, nowSec, onClosed, writeContractAsync]);
}
