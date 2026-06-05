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
import { GRID646_ABI, resolveGrid646Address } from "@/lib/grid646Abi";
import { Grid646GameBanner } from "@/components/Grid646GameBanner";
import { OsSubTabs } from "@/components/os/OsChrome";
import { Grid646Board } from "@/components/Grid646Board";
import { Grid646GameEndPanel } from "@/components/Grid646GameEndPanel";
import { Grid646WinOverlay } from "@/components/Grid646WinOverlay";
import { useGrid646Rooms } from "@/hooks/useGrid646Rooms";
import {
  buildBoard,
  formatGameStake,
  isFreeStake,
  shortenAddr,
  type Grid646GameView,
} from "@/lib/grid646";
import {
  canCloseCasualIdle,
  formatIdleCountdown,
  secondsUntilCasualClose,
} from "@/lib/grid646Timeouts";
import { findWinningCells, winningCellKeys } from "@/lib/grid646Logic";
import {
  canEnterRoom,
  hasPlayerO,
  historySummary,
  isGameDraw,
  isPastRoom,
  isZeroAddress,
  parseGetGameResult,
  roomOccupancy,
  statusLabel,
  winnerMark,
  type Grid646RawGame,
} from "@/lib/grid646Rooms";

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

export function Grid646GamePanel() {
  const contract = resolveGrid646Address();
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

  const { nextId, liveRooms, pastRooms, refetchNextId, refetchRooms } = useGrid646Rooms(
    contract,
    playStyle
  );

  const { data: minStake } = useReadContract({
    address: contract,
    abi: GRID646_ABI,
    functionName: "MIN_STAKE",
    chainId: base.id,
    query: { enabled: Boolean(contract) },
  });

  const { data: maxStake } = useReadContract({
    address: contract,
    abi: GRID646_ABI,
    functionName: "MAX_STAKE",
    chainId: base.id,
    query: { enabled: Boolean(contract) },
  });

  const { data: casualTimeoutWei } = useReadContract({
    address: contract,
    abi: GRID646_ABI,
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

  const gameId = activeGameId;

  const { data: rawGame, refetch: refetchGame } = useReadContract({
    address: contract,
    abi: GRID646_ABI,
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
    void openRoom(id, false);
  }, [searchParams, contract]);

  const game: Grid646GameView | null = useMemo(() => {
    if (!rawGame || gameId == null) return null;
    return parseGetGameResult(gameId, rawGame as Grid646RawGame);
  }, [rawGame, gameId]);

  const board = useMemo(
    () => (game ? buildBoard(game.xMask, game.oMask) : null),
    [game]
  );

  const gameEnded = game?.status === "finished" || game?.status === "cancelled";
  const isDraw = game != null && isGameDraw(game);
  const winMark = game ? winnerMark(game) : null;
  const winningLine = useMemo(() => {
    if (!game || !winMark) return null;
    return findWinningCells(game.xMask, game.oMask, winMark);
  }, [game, winMark]);

  const winningKeys = useMemo(() => winningCellKeys(winningLine), [winningLine]);

  function leaveRoom() {
    setActiveGameId(null);
    setHighlightRoom(null);
    setTxNote(null);
  }

  const { writeContractAsync, error: writeError } = useWriteContract();

  const myRole = useMemo(() => {
    if (!game || !address) return null;
    const me = address.toLowerCase();
    if (game.playerX.toLowerCase() === me) return "X" as const;
    if (game.playerO.toLowerCase() === me) return "O" as const;
    return null;
  }, [game, address]);

  useEffect(() => {
    if (!game || !isPastRoom(game) || myRole != null) return;
    leaveRoom();
  }, [game, myRole]);

  const isMyTurn =
    game?.status === "active" &&
    myRole != null &&
    ((game.turn === 0 && myRole === "X") || (game.turn === 1 && myRole === "O"));

  type Grid646Write =
    | { functionName: "createGame"; value: bigint }
    | { functionName: "joinGame"; args: readonly [bigint]; value: bigint }
    | { functionName: "play"; args: readonly [bigint, number, number] }
    | { functionName: "closeCasualIdleGame"; args: readonly [bigint] };

  async function runTx(
    note: string,
    request: Grid646Write,
    after?: () => void | Promise<void>
  ) {
    if (!contract) return;
    setIsBusy(true);
    setTxNote(note);
    setLastTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: GRID646_ABI,
        chainId: base.id,
        ...request,
      } as Parameters<typeof writeContractAsync>[0]);
      setLastTxHash(hash);
      setTxNote("Confirming…");
      await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: base.id,
        pollingInterval: 250,
        confirmations: 1,
      });
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

  function canJoinGame(g: Grid646GameView, wallet: string | undefined): boolean {
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
        abi: GRID646_ABI,
        functionName: "getGame",
        args: [id],
        chainId: base.id,
      });
      const loaded = parseGetGameResult(id, raw as Grid646RawGame);
      if (isPastRoom(loaded)) {
        setTxNote("This game has ended — board is no longer available.");
        return;
      }
      if (tryJoin) {
        if (canJoinGame(loaded, address)) {
          setActiveGameId(id);
          setRoomInput(String(id));
          await runTx(`Joining room #${String(id)} as O…`, {
            functionName: "joinGame",
            args: [id],
            value: loaded.stakeWei,
          });
          return;
        }
        if (canEnterRoom(loaded, address)) {
          setActiveGameId(id);
          setRoomInput(String(id));
          return;
        }
        setTxNote("Cannot join this room — it may be full or already started.");
        return;
      }

      if (!canEnterRoom(loaded, address)) {
        setTxNote("You can only open rooms you are playing in.");
        return;
      }
      setActiveGameId(id);
      setRoomInput(String(id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load room";
      setTxNote(msg);
    }
  }

  function createRoom(afterCreate?: (id: bigint) => void) {
    if (!contract) return;
    let value: bigint = BigInt(0);
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
          afterCreate?.(id);
        }
      }
    );
  }

  function handleCreateRematch() {
    leaveRoom();
    createRoom((id) => {
      setTxNote(`Rematch room #${String(id)} — share this number with your opponent.`);
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

  function handlePlay(row: number, col: number) {
    if (!contract || gameId == null || !isMyTurn) return;
    void runTx(`Move (${row + 1}, ${col + 1})…`, {
      functionName: "play",
      args: [gameId, row, col],
    });
  }

  function handleCloseCasualIdle(id: bigint) {
    if (!contract || !hasCasualIdleClose) return;
    void runTx(`Closing idle casual room #${String(id)}…`, {
      functionName: "closeCasualIdleGame",
      args: [id],
    });
  }

  const canJoin = game != null && canJoinGame(game, address);
  const gameCanCloseIdle =
    game != null && hasCasualIdleClose && canCloseCasualIdle(game, nowSec);
  const gameIdleCountdown =
    game != null && isFreeStake(game.stakeWei) && !gameEnded
      ? secondsUntilCasualClose(game, nowSec)
      : null;

  const waitingForOpponent =
    game?.status === "open" && !hasPlayerO(game.playerO) && myRole === "X";

  if (!contract) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-300/30 bg-amber-500/10 p-6 text-sm text-amber-100">
        <p className="font-bold">Grid 6×6 not deployed yet</p>
        <p className="mt-2 text-amber-200/80">
          Set <span className="font-mono">NEXT_PUBLIC_GRID646_ADDRESS</span> after{" "}
          <span className="font-mono">npm run contract:deploy:grid646</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <Grid646GameBanner />

      <OsSubTabs
        tabs={[
          { id: "fun" as const, label: "Casual" },
          { id: "money" as const, label: "Ranked" },
        ]}
        active={playStyle}
        onChange={setPlayStyle}
      />

      {!isConnected ? (
        <p className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          Connect a wallet on <strong>Base</strong> to create or join a room.
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
      ) : (
        <>
          <section className="os-panel p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
              {playStyle === "money" ? "Ranked lobby" : "Casual lobby"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Next room # {nextId != null ? String(nextId) : "…"}
              {playStyle === "money" && minStake != null && maxStake != null
                ? ` · stake ${formatEther(minStake as bigint)}–${formatEther(maxStake as bigint)} ETH`
                : playStyle === "fun"
                  ? " · 0 ETH"
                  : ""}
            </p>

            {playStyle === "money" ? (
              <label className="mt-4 block">
                <span className="text-xs font-bold text-slate-500">Stake (ETH)</span>
                <input
                  type="text"
                  value={stakeEth}
                  onChange={(e) => setStakeEth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-emerald-300/50"
                />
              </label>
            ) : (
              <p className="mt-4 rounded-xl border border-slate-400/20 bg-slate-500/10 px-4 py-3 text-sm text-slate-300">
                No stake — room number only.
              </p>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={() => createRoom()}
              className={`mt-3 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-50 ${
                playStyle === "money" ? "bg-emerald-500/80" : "bg-slate-500/60"
              }`}
            >
              {playStyle === "money" ? "Create ranked room (you are X)" : "Create casual room (you are X)"}
            </button>

            {highlightRoom != null && activeGameId === highlightRoom ? (
              <p className="mt-3 rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/15 px-4 py-3 text-center text-sm font-bold text-fuchsia-100">
                Your room: <span className="font-mono text-lg">#{String(highlightRoom)}</span>
                <span className="mt-1 block text-xs font-normal text-fuchsia-200/80">
                  Status 1/0 — tell opponent the room number, they tap Connect
                </span>
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Room #"
                className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300/50"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleConnect}
                className="shrink-0 rounded-xl border border-cyan-300/50 bg-cyan-500/20 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </section>

          <section className="os-panel p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">Open rooms</h3>
            <p className="mt-1 text-xs text-slate-500">
              Waiting or in play · tap to join or resume your game
            </p>
            {liveRooms.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-500">No open rooms yet — create one above.</p>
            ) : (
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {liveRooms.map((r) => {
                  const occ = roomOccupancy(r);
                  const joinable = canJoinGame(r, address);
                  const mine = canEnterRoom(r, address);
                  const actionable = joinable || mine;
                  const idleClosable =
                    hasCasualIdleClose && canCloseCasualIdle(r, nowSec);
                  return (
                    <li key={String(r.gameId)}>
                      {actionable ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void openRoom(r.gameId, joinable)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                            activeGameId === r.gameId
                              ? "border-cyan-400/50 bg-cyan-500/15"
                              : "border-white/10 bg-black/30 hover:border-white/20"
                          }`}
                        >
                          <span className="font-mono text-base font-black text-white">
                            #{String(r.gameId)}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono font-bold ${
                              occ === "1/0"
                                ? "bg-amber-500/25 text-amber-100"
                                : "bg-emerald-500/20 text-emerald-100"
                            }`}
                          >
                            {occ}
                          </span>
                          <span className="min-w-0 flex-1 text-slate-400">
                            X {shortenAddr(r.playerX)}
                            {hasPlayerO(r.playerO) ? ` · O ${shortenAddr(r.playerO)}` : ""}
                            <span className="block text-[10px] text-slate-500">
                              {statusLabel(r.status)}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-cyan-200/90">
                            {joinable ? "Connect" : "Resume"}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-xs opacity-70">
                          <span className="font-mono font-black text-white">#{String(r.gameId)}</span>
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono font-bold text-emerald-100/80">
                            {occ}
                          </span>
                          <span className="min-w-0 flex-1 text-slate-500">
                            X {shortenAddr(r.playerX)} · O {shortenAddr(r.playerO)}
                          </span>
                          <span className="text-slate-600">In play</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {pastRooms.length > 0 ? (
            <section className="os-panel p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">History</h3>
              <p className="mt-1 text-xs text-slate-600">Finished games — results only, board not available</p>
              <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                {pastRooms.map((r) => (
                  <li
                    key={String(r.gameId)}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5 text-xs"
                  >
                    <span className="font-mono text-base font-black text-slate-400">#{String(r.gameId)}</span>
                    <span className="rounded-md bg-slate-600/30 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                      done
                    </span>
                    <span className="min-w-0 flex-1 text-slate-500">
                      X {shortenAddr(r.playerX)}
                      {hasPlayerO(r.playerO) ? ` · O ${shortenAddr(r.playerO)}` : ""}
                      <span className="block text-[10px] text-slate-600">{historySummary(r)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {game && isConnected && isOnBase ? (
        <>
          <section className="os-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-bold text-white">
                Room <span className="font-mono text-lg">#{String(game.gameId)}</span>
                <span className="ml-2 font-mono text-cyan-300">{roomOccupancy(game)}</span>
              </p>
              <span className="rounded-lg border border-white/10 px-2 py-1 text-xs uppercase text-slate-400">
                {game.status}
              </span>
              {isFreeStake(game.stakeWei) ? (
                <span className="rounded-lg border border-slate-400/30 bg-slate-500/15 px-2 py-1 text-xs text-slate-300">
                  casual
                </span>
              ) : (
                <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
                  ranked
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              X {shortenAddr(game.playerX)} · O{" "}
              {!hasPlayerO(game.playerO) ? "—" : shortenAddr(game.playerO)}
              {!isFreeStake(game.stakeWei) ? ` · ${formatGameStake(game.stakeWei)}` : ""}
            </p>
            {myRole ? (
              <p className="mt-2 text-sm font-bold text-white">
                You are playing as{" "}
                <span className={myRole === "X" ? "text-fuchsia-300" : "text-cyan-300"}>{myRole}</span>
              </p>
            ) : isConnected ? (
              <p className="mt-2 text-sm text-amber-200/90">
                Not in this room — enter the number and tap Connect (or pick from the list).
              </p>
            ) : null}
            {waitingForOpponent ? (
              <p className="mt-3 rounded-xl border border-amber-300/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <span className="font-bold">Waiting for opponent (1/0)</span>
                <span className="mt-1 block text-xs text-amber-200/85">
                  Share room <span className="font-mono font-bold">#{String(game.gameId)}</span> — they enter
                  it and tap Connect in the app.
                </span>
              </p>
            ) : null}
            {canJoin ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void openRoom(game.gameId, true)}
                className="mt-3 w-full rounded-xl border-2 border-cyan-300/60 bg-cyan-500/25 py-3.5 text-sm font-black text-cyan-50 disabled:opacity-50"
              >
                Connect to room #{String(game.gameId)} as O
              </button>
            ) : null}
            {game.status === "active" ? (
              <p className="mt-1 text-xs text-emerald-300/90">
                Turn: {game.turn === 0 ? "X" : "O"}
                {isMyTurn ? " · your move (tx required)" : myRole ? " · wait for opponent" : ""}
              </p>
            ) : null}
            {isFreeStake(game.stakeWei) && hasCasualIdleClose && !gameEnded ? (
              <p className="mt-2 text-xs text-slate-500">
                {gameCanCloseIdle
                  ? "No activity for 1 hour — this casual table can be closed."
                  : gameIdleCountdown != null
                    ? `Auto-close in ${formatIdleCountdown(gameIdleCountdown)} without join or move.`
                    : null}
              </p>
            ) : null}
            {gameCanCloseIdle ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleCloseCasualIdle(game.gameId)}
                className="mt-2 w-full rounded-xl border border-slate-400/35 bg-slate-600/25 py-2.5 text-xs font-bold text-slate-200 disabled:opacity-50"
              >
                Close idle table (on-chain)
              </button>
            ) : null}
            {game.status === "finished" && !isZeroAddress(game.winner) ? (
              <p className="mt-2 text-sm font-bold text-fuchsia-200">
                Winner: {shortenAddr(game.winner)}
                {winMark ? ` (${winMark})` : ""}
              </p>
            ) : null}
            {isDraw ? (
              <p className="mt-2 text-sm font-bold text-slate-300">Draw — board full</p>
            ) : null}

            {!gameEnded ? (
              <button
                type="button"
                onClick={leaveRoom}
                className="mt-3 w-full rounded-xl border border-white/15 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                Leave room (clears this screen)
              </button>
            ) : null}

            {gameEnded ? (
              <Grid646GameEndPanel
                game={game}
                myRole={myRole}
                address={address}
                isBusy={isBusy}
                onLeave={leaveRoom}
                onCreateRematch={handleCreateRematch}
              />
            ) : null}
          </section>

          {board && (!isPastRoom(game) || myRole) ? (
            <div className="relative">
              <Grid646Board
                board={board}
                winningKeys={winningKeys}
                winningLine={winningLine}
                disabled={!isMyTurn || gameEnded}
                isBusy={isBusy}
                onPlay={handlePlay}
                showLockedHint={game.status === "open"}
              />
              {game.status === "finished" ? (
                <Grid646WinOverlay
                  label={isDraw ? "DRAW" : "WIN"}
                  sublabel={
                    isDraw
                      ? "No winner — board full"
                      : winMark
                        ? `${winMark} wins · ${shortenAddr(game.winner)}`
                        : shortenAddr(game.winner)
                  }
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {txNote || writeError ? (
        <p className="text-center text-xs text-slate-400">
          {writeError?.message ?? txNote}
        </p>
      ) : null}

      {lastTxHash ? (
        <p className="text-center text-xs text-emerald-300/80">
          Tx{" "}
          <a
            href={`https://basescan.org/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            BaseScan ↗
          </a>
        </p>
      ) : null}
    </div>
  );
}

