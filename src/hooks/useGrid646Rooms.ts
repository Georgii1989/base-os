"use client";

import { useMemo } from "react";
import { base } from "wagmi/chains";
import { useReadContract, useReadContracts } from "wagmi";
import { GRID646_ABI } from "@/lib/grid646Abi";
import type { Grid646GameView } from "@/lib/grid646";
import {
  isLobbyRoom,
  matchesPlayStyle,
  parseGetGameResult,
  recentRoomIds,
  sortLobbyRooms,
  type Grid646RawGame,
} from "@/lib/grid646Rooms";

type PlayStyle = "fun" | "money";

export function useGrid646Rooms(
  contract: `0x${string}` | undefined,
  playStyle: PlayStyle
) {
  const { data: nextId, refetch: refetchNextId } = useReadContract({
    address: contract,
    abi: GRID646_ABI,
    functionName: "nextGameId",
    chainId: base.id,
    query: { enabled: Boolean(contract), refetchInterval: 6_000 },
  });

  const roomIds = useMemo(
    () => recentRoomIds(nextId as bigint | undefined),
    [nextId]
  );

  const { data: rawGames, refetch: refetchRooms, isFetching } = useReadContracts({
    contracts: roomIds.map((id) => ({
      address: contract!,
      abi: GRID646_ABI,
      functionName: "getGame" as const,
      args: [id] as const,
      chainId: base.id,
    })),
    query: {
      enabled: Boolean(contract && roomIds.length > 0),
      refetchInterval: 5_000,
    },
  });

  const rooms = useMemo(() => {
    if (!rawGames) return [];
    const list: Grid646GameView[] = [];
    for (let i = 0; i < roomIds.length; i++) {
      const raw = rawGames[i]?.result;
      if (!raw || rawGames[i]?.status !== "success") continue;
      try {
        const game = parseGetGameResult(roomIds[i]!, raw as Grid646RawGame);
        if (!isLobbyRoom(game) || !matchesPlayStyle(game, playStyle)) continue;
        list.push(game);
      } catch {
        /* skip invalid */
      }
    }
    return list.sort(sortLobbyRooms);
  }, [rawGames, roomIds, playStyle]);

  return {
    nextId: nextId as bigint | undefined,
    rooms,
    refetchNextId,
    refetchRooms,
    isFetching,
  };
}
