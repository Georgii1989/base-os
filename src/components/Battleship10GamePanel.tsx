"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useConfig,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import {
  BATTLESHIP10_ABI,
  resolveBattleship10Address,
  resolveBattleship10SupportsMask,
} from "@/lib/battleship10Abi";
import { Battleship10BattleBoards } from "@/components/Battleship10Board";
import { Battleship10GameEndPanel } from "@/components/Battleship10GameEndPanel";
import { Battleship10InviteBar } from "@/components/Battleship10InviteBar";
import { Battleship10PlacementEditor } from "@/components/Battleship10PlacementEditor";
import { useBattleship10IdleCloser } from "@/hooks/useBattleship10IdleCloser";
import { useBattleship10Rooms } from "@/hooks/useBattleship10Rooms";
import {
  formatGameStake,
  isFreeStake,
  shortenAddr,
  type Battleship10GameView,
  type ShipPlacement,
} from "@/lib/battleship10";
import {
  canCloseCasualIdle,
  formatIdleCountdown,
  secondsUntilCasualClose,
} from "@/lib/battleship10Timeouts";
import { shipsToMask, validateFleet } from "@/lib/battleship10Logic";
import { fleetHasSnake, toStraightContractShips } from "@/lib/battleship10Ship";
import {
  canEnterRoom,
  hasPlayerO,
  historySummary,
  isPastRoom,
  myPlaced,
  opponentPlaced,
  parseGetGameResult,
  roomOccupancy,
  statusLabel,
  type Battleship10RawGame,
} from "@/lib/battleship10Rooms";

const DEFAULT_STAKE = "0.0001";

type PlayStyle = "fun" | "money";

function parseRoomInput(raw: string): bigint | null {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  try {
    const id = BigInt(t);
    return id > BigInt(0) ? id : null;
  } catch {
    return null;
  }
}

export function Battleship10GamePanel() {
  const contract = resolveBattleship10Address();
  const searchParams = useSearchParams();
  const wagmiConfig = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const isOnBase = chainId === base.id;

  const [playStyle, setPlayStyle] = useState<PlayStyle>("fun");
  const [stakeEth, setStakeEth] = useState(DEFAULT_STAKE);
  const [roomInput, setRoomInput] = useState("");
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null);
  const [highlightRoom, setHighlightRoom] = useState<bigint | null>(null);
  const [txNote, setTxNote] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [draftFleet, setDraftFleet] = useState<ShipPlacement[]>([]);

  const { nextId, liveRooms, pastRooms, refetchNextId, refetchRooms } = useBattleship10Rooms(
    contract,
    playStyle
  );

  const { data: minStake } = useReadContract({
    address: contract,
    abi: BATTLESHIP10_ABI,
    functionName: "MIN_STAKE",
    chainId: base.id,
    query: { enabled: Boolean(contract) },
  });

  const { data: maxStake } = useReadContract({
    address: contract,
    abi: BATTLESHIP10_ABI,
    functionName: "MAX_STAKE",
    chainId: base.id,
    query: { enabled: Boolean(contract) },
  });

  const { data: casualTimeoutWei } = useReadContract({
    address: contract,
    abi: BATTLESHIP10_ABI,
    functionName: "CASUAL_INACTIVITY_TIMEOUT",
    chainId: base.id,
    query: { enabled: Boolean(contract) },
  });
  const hasCasualIdleClose = casualTimeoutWei != null;

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useBattleship10IdleCloser(
    contract,
    liveRooms,
    nowSec,
    Boolean(isConnected && isOnBase && contract),
    () => void refetchRooms()
  );

  const gameId = activeGameId;

  const { data: rawGame, refetch: refetchGame } = useReadContract({
    address: contract,
    abi: BATTLESHIP10_ABI,
    functionName: "getGame",
    args: gameId != null ? [gameId] : undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(contract && gameId != null),
      refetchInterval: 4_000,
    },
  });

  useEffect(() => {
    const roomRaw = searchParams.get("room") ?? searchParams.get("join");
    if (!roomRaw || !contract) return;
    const id = parseRoomInput(roomRaw);
    if (id == null) return;
    setRoomInput(String(id));
    void openRoom(id, true);
  }, [searchParams, contract]);

  const game: Battleship10GameView | null = useMemo(() => {
    if (!rawGame || gameId == null) return null;
    return parseGetGameResult(gameId, rawGame as Battleship10RawGame);
  }, [rawGame, gameId]);

  const gameEnded = game?.status === "finished" || game?.status === "cancelled";

  const myRole = useMemo((): "host" | "guest" | null => {
    if (!game || !address) return null;
    const me = address.toLowerCase();
    if (game.playerX.toLowerCase() === me) return "host";
    if (game.playerO.toLowerCase() === me) return "guest";
    return null;
  }, [game, address]);

  const isMyTurn =
    game?.status === "active" &&
    myRole != null &&
    ((game.turn === 0 && myRole === "host") || (game.turn === 1 && myRole === "guest"));

  const { writeContractAsync } = useWriteContract();

  function leaveRoom() {
    setActiveGameId(null);
    setHighlightRoom(null);
    setTxNote(null);
  }

  useEffect(() => {
    if (!game || !isPastRoom(game) || myRole != null) return;
    leaveRoom();
  }, [game, myRole]);

  type BsWrite =
    | { functionName: "createGame"; value: bigint }
    | { functionName: "joinGame"; args: readonly [bigint]; value: bigint }
    | { functionName: "placeFleetMask"; args: readonly [bigint, bigint] }
    | {
        functionName: "placeShips";
        args: readonly [bigint, ReturnType<typeof toStraightContractShips>];
      }
    | { functionName: "fire"; args: readonly [bigint, number, number] }
    | { functionName: "closeCasualIdleGame"; args: readonly [bigint] };

  async function runTx(
    note: string,
    request: BsWrite,
    after?: () => void | Promise<void>
  ) {
    if (!contract) return;
    setIsBusy(true);
    setTxNote(note);
    setLastTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: BATTLESHIP10_ABI,
        chainId: base.id,
        ...request,
      } as Parameters<typeof writeContractAsync>[0]);
      setLastTxHash(hash);
      setTxNote("Confirming…");
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: base.id });
      await refetchGame();
      await refetchRooms();
      await after?.();
      setTxNote("Transaction confirmed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setTxNote(msg);
    } finally {
      setIsBusy(false);
    }
  }

  function canJoinGame(g: Battleship10GameView, wallet: string | undefined): boolean {
    return (
      g.status === "open" &&
      !hasPlayerO(g.playerO) &&
      wallet != null &&
      wallet.toLowerCase() !== g.playerX.toLowerCase()
    );
  }

  async function openRoom(id: bigint, tryJoin: boolean) {
    if (!contract) return;
    setTxNote(null);
    try {
      const raw = await readContract(wagmiConfig, {
        address: contract,
        abi: BATTLESHIP10_ABI,
        functionName: "getGame",
        args: [id],
        chainId: base.id,
      });
      const loaded = parseGetGameResult(id, raw as Battleship10RawGame);
      if (isPastRoom(loaded)) {
        setTxNote("This game has ended.");
        return;
      }
      if (tryJoin) {
        if (canJoinGame(loaded, address)) {
          setActiveGameId(id);
          setRoomInput(String(id));
          await runTx(`Joining room #${String(id)}…`, {
            functionName: "joinGame",
            args: [id],
            value: loaded.stakeWei,
          });
          setDraftFleet([]);
          return;
        }
        if (canEnterRoom(loaded, address)) {
          setActiveGameId(id);
          setRoomInput(String(id));
          return;
        }
        setTxNote("Cannot join — room full or already in battle.");
        return;
      }
      if (!canEnterRoom(loaded, address)) {
        setTxNote("You can only open rooms you are playing in.");
        return;
      }
      setActiveGameId(id);
      setRoomInput(String(id));
    } catch (err) {
      setTxNote(err instanceof Error ? err.message : "Could not load room");
    }
  }

  function createRoom(afterCreate?: (id: bigint) => void) {
    if (!contract) return;
    let value = BigInt(0);
    if (playStyle === "money") {
      try {
        value = parseEther(stakeEth.trim() || DEFAULT_STAKE);
      } catch {
        setTxNote("Invalid stake amount");
        return;
      }
    }
    void runTx(
      playStyle === "money" ? "Creating ranked room…" : "Creating casual room…",
      { functionName: "createGame", value },
      async () => {
        const fresh = await refetchNextId();
        const nid = (fresh.data ?? nextId) as bigint | undefined;
        if (nid != null && nid > BigInt(0)) {
          const id = nid - BigInt(1);
          setActiveGameId(id);
          setRoomInput(String(id));
          setHighlightRoom(id);
          setDraftFleet([]);
          afterCreate?.(id);
        }
      }
    );
  }

  function handleCreateRematch() {
    leaveRoom();
    createRoom((id) => {
      setTxNote(`Rematch room #${String(id)} — share invite link with opponent.`);
    });
  }

  function handleConnect() {
    const id = parseRoomInput(roomInput);
    if (id == null) {
      setTxNote("Enter a valid room number");
      return;
    }
    void openRoom(id, true);
  }

  function handlePlaceShips() {
    if (!contract || gameId == null) return;
    const err = validateFleet(draftFleet);
    if (err) {
      setTxNote(err);
      return;
    }
    const supportsMask = resolveBattleship10SupportsMask();
    if (fleetHasSnake(draftFleet) && !supportsMask) {
      setTxNote("Snake ships need contract v3 (placeFleetMask). Shuffle again for straight layout.");
      return;
    }
    const useMask = supportsMask || fleetHasSnake(draftFleet);
    void runTx("Placing fleet on-chain…", useMask
      ? {
          functionName: "placeFleetMask",
          args: [gameId, shipsToMask(draftFleet)],
        }
      : {
          functionName: "placeShips",
          args: [gameId, toStraightContractShips(draftFleet)],
        });
  }

  function handleFire(row: number, col: number) {
    if (!contract || gameId == null || !isMyTurn) return;
    void runTx(`Fire at ${row + 1},${col + 1}…`, {
      functionName: "fire",
      args: [gameId, row, col],
    });
  }

  function handleCloseCasualIdle(id: bigint) {
    if (!contract || !hasCasualIdleClose) return;
    void runTx(`Closing idle room #${String(id)}…`, {
      functionName: "closeCasualIdleGame",
      args: [id],
    });
  }

  const battleView = useMemo(() => {
    if (!game || myRole == null || game.status !== "active") return null;
    const isHost = myRole === "host";
    return {
      myShots: isHost ? game.shotsX : game.shotsO,
      myHits: isHost ? game.hitsX : game.hitsO,
      myShips: isHost ? game.shipsX : game.shipsO,
      enemyShotsAtMe: isHost ? game.shotsO : game.shotsX,
      enemyHitsOnMe: isHost ? game.hitsO : game.hitsX,
    };
  }, [game, myRole]);

  const gameCanCloseIdle =
    game != null && hasCasualIdleClose && canCloseCasualIdle(game, nowSec);

  if (!contract) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/30 bg-amber-500/10 p-6 text-sm text-amber-100">
        <p className="font-bold">Battleship not deployed yet</p>
        <p className="mt-2 text-amber-200/80">
          Run <span className="font-mono">npm run contract:deploy:battleship10</span> and set{" "}
          <span className="font-mono">NEXT_PUBLIC_BATTLESHIP10_ADDRESS</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <header className="rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-cyan-950/40 to-slate-950 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200/80">1v1 on Base</p>
        <h2 className="mt-2 text-3xl font-black text-white">Battleship</h2>
        <p className="mt-2 text-sm text-slate-400">
          10×10 classic fleet · place ships · hunt opponent · hit = extra turn
        </p>
      </header>

      <div className="flex rounded-2xl border border-cyan-400/25 bg-slate-950/40 p-1">
        {(["fun", "money"] as const).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setPlayStyle(style)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition ${
              playStyle === style
                ? style === "fun"
                  ? "bg-slate-500/60 text-white"
                  : "bg-emerald-500/70 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {style === "fun" ? "Casual" : "Ranked"}
          </button>
        ))}
      </div>

      {!isConnected ? (
        <p className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          Connect a wallet on <strong>Base</strong> to play.
        </p>
      ) : !isOnBase ? (
        <button
          type="button"
          disabled={isSwitching}
          onClick={() => switchChainAsync({ chainId: base.id })}
          className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100"
        >
          {isSwitching ? "Switching…" : "Switch to Base"}
        </button>
      ) : !game ? (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">Lobby</h3>
            <p className="mt-1 text-xs text-slate-500">
              Next room #{nextId != null ? String(nextId) : "…"}
              {playStyle === "money" && minStake != null && maxStake != null
                ? ` · ${formatEther(minStake as bigint)}–${formatEther(maxStake as bigint)} ETH`
                : " · 0 ETH"}
            </p>
            {playStyle === "fun" ? (
              <p className="mt-2 text-[10px] text-slate-600">
                Idle casual rooms auto-close on-chain after 1 hour (cleaned up when lobby is open).
              </p>
            ) : null}
            {playStyle === "money" ? (
              <input
                type="text"
                value={stakeEth}
                onChange={(e) => setStakeEth(e.target.value)}
                className="mt-4 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-sm text-white"
                aria-label="Stake ETH"
              />
            ) : null}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => createRoom()}
              className="mt-3 w-full rounded-xl bg-cyan-600/80 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              Create room (host)
            </button>

            {highlightRoom != null && activeGameId === highlightRoom ? (
              <div className="mt-3">
                <Battleship10InviteBar gameId={highlightRoom} />
              </div>
            ) : null}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Room #"
                className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-sm text-white"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleConnect}
                className="shrink-0 rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-bold text-cyan-100"
              >
                Join
              </button>
            </div>
            {liveRooms.length > 0 ? (
              <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                {liveRooms.map((r) => (
                  <li key={String(r.gameId)}>
                    <button
                      type="button"
                      onClick={() => void openRoom(r.gameId, canJoinGame(r, address))}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5 text-left text-xs"
                    >
                      <span className="font-mono font-black">#{String(r.gameId)}</span>
                      <span className="text-slate-500">{statusLabel(r.status)}</span>
                      <span className="ml-auto font-bold text-cyan-200">
                        {canJoinGame(r, address) ? "Join" : "Open"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          {pastRooms.length > 0 ? (
            <section className="rounded-3xl border border-white/8 bg-slate-950/40 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">History</h3>
              <ul className="mt-3 max-h-32 space-y-2 overflow-y-auto">
                {pastRooms.map((r) => (
                  <li
                    key={String(r.gameId)}
                    className="flex gap-3 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-500"
                  >
                    <span className="font-mono font-black">#{String(r.gameId)}</span>
                    <span>{historySummary(r)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-bold text-white">
                Room <span className="font-mono text-lg">#{String(game.gameId)}</span>
                <span className="ml-2 font-mono text-cyan-300">{roomOccupancy(game)}</span>
              </p>
              <span className="rounded-lg border border-white/10 px-2 py-1 text-xs uppercase text-slate-400">
                {game.status}
              </span>
              <span className="text-xs text-slate-500">{formatGameStake(game.stakeWei)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Host {shortenAddr(game.playerX)} · Guest{" "}
              {!hasPlayerO(game.playerO) ? "—" : shortenAddr(game.playerO)}
            </p>
            {myRole != null ? (
              <button
                type="button"
                onClick={leaveRoom}
                className="mt-3 text-xs font-bold text-slate-500 hover:text-white"
              >
                ← Back to lobby
              </button>
            ) : null}
          </section>

          {game.status === "open" && myRole === "host" ? (
            <Battleship10InviteBar gameId={game.gameId} />
          ) : null}

          {game.status === "placing" && myRole != null ? (
            <>
              {!myPlaced(game, myRole) ? (
                <>
                  <Battleship10PlacementEditor
                    fleet={draftFleet}
                    onFleetChange={setDraftFleet}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    disabled={isBusy || validateFleet(draftFleet) !== null}
                    onClick={handlePlaceShips}
                    className="w-full rounded-xl bg-amber-500/80 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    Confirm fleet (on-chain)
                  </button>
                </>
              ) : (
                <p className="rounded-2xl border border-slate-400/25 bg-slate-500/10 px-4 py-3 text-center text-sm text-slate-300">
                  Fleet placed — waiting for opponent
                  {!opponentPlaced(game, myRole) ? "…" : " (starting battle…)"}
                </p>
              )}
            </>
          ) : null}

          {game.status === "active" && battleView ? (
            <>
              <p className="text-center text-sm font-bold text-white">
                {isMyTurn ? "Your turn — pick a cell to fire" : "Opponent's turn"}
                {isMyTurn ? " · hit = shoot again" : ""}
              </p>
              <Battleship10BattleBoards
                myShots={battleView.myShots}
                myHits={battleView.myHits}
                myShips={battleView.myShips}
                enemyShotsAtMe={battleView.enemyShotsAtMe}
                enemyHitsOnMe={battleView.enemyHitsOnMe}
                canFire={isMyTurn}
                isBusy={isBusy}
                onFire={handleFire}
              />
            </>
          ) : null}

          {game.status === "finished" && game.winner !== "0x0000000000000000000000000000000000000000" ? (
            <>
              <p className="rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/15 px-4 py-4 text-center text-sm font-bold text-fuchsia-100">
                Winner: {shortenAddr(game.winner)}
                {!isFreeStake(game.stakeWei) ? " · takes both stakes" : ""}
              </p>
              <Battleship10GameEndPanel
                game={game}
                myRole={myRole}
                address={address}
                isBusy={isBusy}
                onLeave={leaveRoom}
                onCreateRematch={handleCreateRematch}
              />
            </>
          ) : null}

          {gameCanCloseIdle ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleCloseCasualIdle(game.gameId)}
              className="w-full rounded-xl border border-slate-400/35 py-2.5 text-xs font-bold text-slate-200"
            >
              Close idle casual room
            </button>
          ) : null}

          {isFreeStake(game.stakeWei) && !gameEnded && hasCasualIdleClose ? (
            <p className="text-center text-xs text-slate-600">
              Auto-close in {formatIdleCountdown(secondsUntilCasualClose(game, nowSec))} without
              activity
            </p>
          ) : null}
        </>
      )}

      {txNote ? (
        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center text-xs text-slate-400">
          {txNote}
          {lastTxHash ? (
            <>
              {" "}
              <a
                href={`https://basescan.org/tx/${lastTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Basescan
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
