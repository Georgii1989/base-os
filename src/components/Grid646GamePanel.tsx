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
import { waitForTransactionReceipt } from "wagmi/actions";
import { GRID646_ABI, resolveGrid646Address } from "@/lib/grid646Abi";
import { Grid646LocalPanel } from "@/components/Grid646LocalPanel";
import {
  buildBoard,
  formatGameStake,
  grid646JoinUrl,
  GRID646_STATUS,
  isFreeStake,
  shortenAddr,
  type CellMark,
  type Grid646GameView,
} from "@/lib/grid646";

const DEFAULT_STAKE = "0.0001";

type PlayStyle = "fun" | "money";
type FunChannel = "local" | "onchain";

function parseGameIdInput(raw: string): bigint | null {
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
  const [funChannel, setFunChannel] = useState<FunChannel>("onchain");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [stakeEth, setStakeEth] = useState(DEFAULT_STAKE);
  const [gameIdInput, setGameIdInput] = useState("");
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null);
  const [txNote, setTxNote] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const { data: nextId, refetch: refetchNextId } = useReadContract({
    address: contract,
    abi: GRID646_ABI,
    functionName: "nextGameId",
    chainId: base.id,
    query: { enabled: Boolean(contract) },
  });

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

  const showOnchain = playStyle === "money" || (playStyle === "fun" && funChannel === "onchain");

  useEffect(() => {
    const joinRaw = searchParams.get("join");
    if (!joinRaw) return;
    const id = parseGameIdInput(joinRaw);
    if (id == null) return;
    setPlayStyle("fun");
    setFunChannel("onchain");
    setActiveGameId(id);
    setGameIdInput(String(id));
  }, [searchParams]);

  const game: Grid646GameView | null = useMemo(() => {
    if (!rawGame || gameId == null) return null;
    const [playerX, playerO, stakeWei, statusNum, winner, turn, xMask, oMask, lastMoveAt] = rawGame;
    return {
      gameId,
      playerX: playerX as `0x${string}`,
      playerO: playerO as `0x${string}`,
      stakeWei: stakeWei as bigint,
      status: GRID646_STATUS[Number(statusNum)] ?? "open",
      winner: winner as `0x${string}`,
      turn: Number(turn) === 1 ? 1 : 0,
      xMask: xMask as bigint,
      oMask: oMask as bigint,
      lastMoveAt: Number(lastMoveAt),
    };
  }, [rawGame, gameId]);

  const board = useMemo(
    () => (game ? buildBoard(game.xMask, game.oMask) : null),
    [game]
  );

  const { writeContractAsync, error: writeError } = useWriteContract();

  const myRole = useMemo(() => {
    if (!game || !address) return null;
    const me = address.toLowerCase();
    if (game.playerX.toLowerCase() === me) return "X" as const;
    if (game.playerO.toLowerCase() === me) return "O" as const;
    return null;
  }, [game, address]);

  const isMyTurn =
    game?.status === "active" &&
    myRole != null &&
    ((game.turn === 0 && myRole === "X") || (game.turn === 1 && myRole === "O"));

  type Grid646Write =
    | { functionName: "createGame"; value: bigint }
    | { functionName: "joinGame"; args: readonly [bigint]; value: bigint }
    | { functionName: "play"; args: readonly [bigint, number, number] };

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
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: base.id });
      await refetchGame();
      await after?.();
      setTxNote("Transaction confirmed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setTxNote(msg);
    } finally {
      setIsBusy(false);
    }
  }

  function handleCreate() {
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
      playStyle === "money" ? "Creating ranked game…" : "Creating casual game (0 ETH)…",
      {
        functionName: "createGame",
        value,
      },
      async () => {
        if (playStyle === "fun") setFunChannel("onchain");
        const fresh = await refetchNextId();
        const nid = (fresh.data ?? nextId) as bigint | undefined;
        if (nid != null && nid > BigInt(0)) {
          const id = nid - BigInt(1);
          setActiveGameId(id);
          setGameIdInput(String(id));
        }
      }
    );
  }

  async function copyInviteLink() {
    if (gameId == null || typeof window === "undefined") return;
    const url = grid646JoinUrl(window.location.origin, gameId);
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    } catch {
      setTxNote(url);
    }
  }

  function handleJoin() {
    if (gameId == null || !game) return;
    void runTx("Joining as O…", {
      functionName: "joinGame",
      args: [gameId],
      value: game.stakeWei,
    });
  }

  const canJoin =
    game?.status === "open" &&
    game.playerO === "0x0000000000000000000000000000000000000000" &&
    address != null &&
    address.toLowerCase() !== game.playerX.toLowerCase();

  const waitingForOpponent =
    game?.status === "open" &&
    game.playerO === "0x0000000000000000000000000000000000000000" &&
    myRole === "X";

  function handlePlay(row: number, col: number) {
    if (!contract || gameId == null || !isMyTurn) return;
    void runTx(`Move (${row + 1}, ${col + 1})…`, {
      functionName: "play",
      args: [gameId, row, col],
    });
  }

  function loadGameFromInput() {
    const id = parseGameIdInput(gameIdInput);
    if (id == null) {
      setTxNote("Enter a valid game ID");
      return;
    }
    setActiveGameId(id);
    setTxNote(null);
  }

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
      <section className="rounded-3xl border border-emerald-300/25 bg-gradient-to-br from-emerald-500/10 via-slate-950/60 to-cyan-500/10 p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-emerald-200/90">Game</p>
        <h2 className="mt-2 text-2xl font-black text-white">Grid 6×6 · Four in a row</h2>
        <p className="mt-3 text-sm text-slate-300">
          6×6, win with <strong className="text-white">four in a row</strong>. Pick{" "}
          <strong className="text-white">casual</strong> (no stake) or{" "}
          <strong className="text-white">ranked</strong> (ETH in the contract).
        </p>
      </section>

      <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
        <button
          type="button"
          onClick={() => setPlayStyle("fun")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition ${
            playStyle === "fun"
              ? "bg-slate-500/40 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Casual
        </button>
        <button
          type="button"
          onClick={() => setPlayStyle("money")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition ${
            playStyle === "money"
              ? "bg-emerald-600/50 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Ranked
        </button>
      </div>

      {playStyle === "fun" ? (
        <div className="flex rounded-2xl border border-cyan-400/20 bg-cyan-950/30 p-1">
          <button
            type="button"
            onClick={() => setFunChannel("local")}
            className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-black leading-tight transition ${
              funChannel === "local"
                ? "bg-cyan-600/40 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Same screen
            <span className="mt-0.5 block font-normal text-[10px] opacity-80">no wallet</span>
          </button>
          <button
            type="button"
            onClick={() => setFunChannel("onchain")}
            className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-black leading-tight transition ${
              funChannel === "onchain"
                ? "bg-cyan-600/40 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Online 1v1
            <span className="mt-0.5 block font-normal text-[10px] opacity-80">2 wallets</span>
          </button>
        </div>
      ) : null}

      {playStyle === "fun" && funChannel === "local" ? <Grid646LocalPanel /> : null}

      {!isConnected && showOnchain ? (
        <p className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          Connect a wallet on <strong>Base</strong> for online play (on mobile, open the invite link in
          Base app).
        </p>
      ) : !isOnBase && showOnchain && isConnected ? (
        <button
          type="button"
          disabled={isSwitching}
          onClick={() => switchChainAsync({ chainId: base.id })}
          className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100"
        >
          {isSwitching ? "Switching…" : "Switch to Base"}
        </button>
      ) : null}

      {showOnchain && isConnected && isOnBase ? (
      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
          {playStyle === "money" ? "Lobby · ranked" : "Lobby · casual onchain"}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Next game ID: {nextId != null ? String(nextId) : "…"}
          {playStyle === "money" && minStake != null && maxStake != null
            ? ` · stake ${formatEther(minStake as bigint)}–${formatEther(maxStake as bigint)} ETH`
            : " · stake 0 ETH (casual)"}
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
            Stake <strong className="text-white">0 ETH</strong> — play for bragging rights, no pot.
          </p>
        )}
        <button
          type="button"
          disabled={!isConnected || !isOnBase || isBusy}
          onClick={handleCreate}
          className={`mt-3 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-50 ${
            playStyle === "money" ? "bg-emerald-500/80" : "bg-slate-500/60"
          }`}
        >
          {playStyle === "money"
            ? "Create ranked game (you play X)"
            : "Create casual game · 0 ETH (you play X)"}
        </button>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            placeholder="Game ID"
            className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300/50"
          />
          <button
            type="button"
            onClick={loadGameFromInput}
            className="shrink-0 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200"
          >
            Load
          </button>
        </div>
        {canJoin ? (
          <button
            type="button"
            disabled={isBusy || gameId == null}
            onClick={handleJoin}
            className="mt-3 w-full rounded-xl border-2 border-cyan-300/60 bg-cyan-500/25 py-3.5 text-sm font-black text-cyan-50 disabled:opacity-50"
          >
            Join game #{gameId != null ? String(gameId) : "?"} as O · {formatGameStake(game!.stakeWei)}
          </button>
        ) : null}
      </section>
      ) : null}

      {game && showOnchain ? (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-bold text-white">Game #{String(game.gameId)}</p>
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
              {game.playerO === "0x0000000000000000000000000000000000000000"
                ? "waiting…"
                : shortenAddr(game.playerO)}{" "}
              · pot{" "}
              {(game.status === "active" || game.status === "open") &&
              game.playerO &&
              !isFreeStake(game.stakeWei)
                ? formatGameStake(game.stakeWei * BigInt(2))
                : formatGameStake(game.stakeWei)}
            </p>
            {myRole ? (
              <p className="mt-2 text-sm font-bold text-white">
                You are playing as{" "}
                <span className={myRole === "X" ? "text-fuchsia-300" : "text-cyan-300"}>{myRole}</span>
              </p>
            ) : isConnected ? (
              <p className="mt-2 text-sm text-amber-200/90">
                This wallet is not in the game — tap Join as O above (must differ from the host address).
              </p>
            ) : null}
            {waitingForOpponent ? (
              <div className="mt-3 space-y-2 rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p className="font-bold">Waiting for opponent</p>
                <p className="text-xs text-amber-200/85">
                  Until O joins, onchain moves are disabled. Share the link in Base app — they confirm one
                  transaction, then you alternate (X, then O).
                </p>
                <button
                  type="button"
                  onClick={() => void copyInviteLink()}
                  className="w-full rounded-lg bg-amber-500/25 py-2 text-xs font-black text-amber-50"
                >
                  {inviteCopied
                    ? "Link copied"
                    : `Copy invite link · game #${String(game.gameId)}`}
                </button>
                <p className="font-mono text-[10px] text-amber-200/70">
                  or ID: {String(game.gameId)} → Load on the other device
                </p>
              </div>
            ) : null}
            {canJoin ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleJoin}
                className="mt-3 w-full rounded-xl border-2 border-cyan-300/60 bg-cyan-500/25 py-3.5 text-sm font-black text-cyan-50 disabled:opacity-50"
              >
                Join as O (required before moves)
              </button>
            ) : null}
            {game.status === "active" ? (
              <p className="mt-1 text-xs text-emerald-300/90">
                Turn: {game.turn === 0 ? "X" : "O"}
                {isMyTurn ? " · your move (tx required)" : myRole ? " · wait for opponent" : ""}
              </p>
            ) : null}
            {game.status === "finished" && game.winner !== "0x0000000000000000000000000000000000000000" ? (
              <p className="mt-2 text-sm font-bold text-fuchsia-200">
                Winner: {shortenAddr(game.winner)}
              </p>
            ) : null}
          </section>

          {board ? (
            <section className="relative rounded-3xl border border-white/10 bg-black/40 p-4">
              {game.status === "open" ? (
                <p className="mb-3 text-center text-xs text-slate-400">
                  Board locked until opponent joins
                </p>
              ) : null}
              <div
                className="mx-auto grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(6, minmax(0, 1fr))`, maxWidth: "22rem" }}
              >
                {board.map((row, r) =>
                  row.map((cell, c) => (
                    <CellButton
                      key={`${r}-${c}`}
                      cell={cell}
                      disabled={!isMyTurn || cell !== "empty" || isBusy}
                      onClick={() => handlePlay(r, c)}
                    />
                  ))
                )}
              </div>
            </section>
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

function CellButton({
  cell,
  disabled,
  onClick,
}: {
  cell: CellMark;
  disabled: boolean;
  onClick: () => void;
}) {
  const filled =
    cell === "X"
      ? "bg-fuchsia-500/35 border-fuchsia-300/50 text-fuchsia-100"
      : cell === "O"
        ? "bg-cyan-500/35 border-cyan-300/50 text-cyan-100"
        : "bg-white/[0.03] border-white/10 text-slate-600 hover:border-emerald-400/40 hover:bg-emerald-500/10";

  return (
    <button
      type="button"
      disabled={disabled || cell !== "empty"}
      onClick={onClick}
      className={`aspect-square rounded-lg border text-lg font-black transition ${filled} disabled:cursor-default`}
      aria-label={cell === "empty" ? "Play here" : cell}
    >
      {cell === "empty" ? "" : cell}
    </button>
  );
}
