"use client";

import { useMemo } from "react";
import { base } from "wagmi/chains";
import { useReadContract, useReadContracts } from "wagmi";
import { BATTLESHIP10_ABI } from "@/lib/battleship10Abi";
import type { Battleship10GameView } from "@/lib/battleship10";
import {
  isLiveRoom,
  isPastRoom,
  matchesPlayStyle,
  parseGetGameResult,
  recentRoomIds,
  sortLobbyRooms,
  sortPastRooms,
  type Battleship10RawGame,
} from "@/lib/battleship10Rooms";

type PlayStyle = "fun" | "money";

export function useBattleship10Rooms(
  contract: `0x${string}` | undefined,
  playStyle: PlayStyle
) {
  const { data: nextId, refetch: refetchNextId } = useReadContract({
    address: contract,
    abi: BATTLESHIP10_ABI,
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
      abi: BATTLESHIP10_ABI,
      functionName: "getGame" as const,
      args: [id] as const,
      chainId: base.id,
    })),
    query: {
      enabled: Boolean(contract && roomIds.length > 0),
      refetchInterval: 5_000,
    },
  });

  const { liveRooms, pastRooms } = useMemo(() => {
    const live: Battleship10GameView[] = [];
    const past: Battleship10GameView[] = [];
    if (!rawGames) return { liveRooms: live, pastRooms: past };
    for (let i = 0; i < roomIds.length; i++) {
      const raw = rawGames[i]?.result;
      if (!raw || rawGames[i]?.status !== "success") continue;
      try {
        const game = parseGetGameResult(roomIds[i]!, raw as Battleship10RawGame);
        if (!matchesPlayStyle(game, playStyle)) continue;
        if (isLiveRoom(game)) live.push(game);
        else if (isPastRoom(game)) past.push(game);
      } catch {
        /* skip */
      }
    }
    return {
      liveRooms: live.sort(sortLobbyRooms),
      pastRooms: past.sort(sortPastRooms),
    };
  }, [rawGames, roomIds, playStyle]);

  return {
    nextId: nextId as bigint | undefined,
    liveRooms,
    pastRooms,
    refetchNextId,
    refetchRooms,
    isFetching,
  };
}
