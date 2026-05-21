import Link from "next/link";
import { formatEther } from "viem";
import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";

function formatDate(ts: number | null): string {
  if (ts == null) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative mx-auto grid h-40 w-40 place-items-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="11" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#cardScoreGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="cardScoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-black text-white">{score}</p>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">Grade {grade}</p>
      </div>
    </div>
  );
}

type Props = {
  data: OnchainScorePayload;
};

export function IdentityCard({ data }: Props) {
  const m = data.score.metrics;
  const balanceEth = formatEther(BigInt(data.balanceWei));
  const maxProtocolTxs = Math.max(1, ...data.topProtocols.map((p) => p.txs));
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://app-base-os.vercel.app";

  return (
    <article className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-gradient-to-b from-slate-950/90 via-[#0a0f1e] to-[#12081f] shadow-[0_0_80px_rgba(34,211,238,0.12)]">
      <header className="border-b border-white/8 bg-black/30 px-6 py-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200/80">Base OS</p>
        <p className="mt-2 text-lg font-black text-white">Onchain identity</p>
        <p className="mt-2 font-mono text-sm font-bold text-cyan-100/90">
          {shortenAddressDisplay(data.address)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {data.isContract ? "Contract" : "Wallet"} · {Number(balanceEth).toFixed(4)} ETH
        </p>
      </header>

      <div className="px-6 py-6">
        <ScoreRing score={data.score.score} grade={data.score.grade} />

        <dl className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-white/8 bg-black/30 px-2 py-3">
            <dt className="text-slate-500">Active days</dt>
            <dd className="mt-1 text-lg font-black text-white">{m.activeDays}</dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/30 px-2 py-3">
            <dt className="text-slate-500">Outgoing</dt>
            <dd className="mt-1 text-lg font-black text-white">
              {formatCompactNumber(m.outgoingTxs)}
            </dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/30 px-2 py-3">
            <dt className="text-slate-500">Contracts</dt>
            <dd className="mt-1 text-lg font-black text-white">
              {formatCompactNumber(m.uniqueContractsTouched)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          On Base since {formatDate(m.firstActivityAt)} · last {formatDate(m.lastActivityAt)}
        </p>

        {data.topProtocols.length > 0 ? (
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Top touchpoints
            </p>
            <ul className="mt-3 space-y-2">
              {data.topProtocols.map((p) => (
                <li key={p.address}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-slate-200">{p.label}</span>
                    <span className="shrink-0 font-mono text-xs text-slate-500">
                      {p.txs} tx{p.txs === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-fuchsia-500/70"
                      style={{ width: `${Math.round((p.txs / maxProtocolTxs) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">No outgoing touchpoints in indexed history.</p>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-white/8 bg-black/35 px-6 py-5">
        <Link
          href={`${appOrigin}/?tab=score`}
          className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-fuchsia-500/80 py-3 text-center text-sm font-black text-white"
        >
          Check your score
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/${data.address}`}
            className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/10 py-2.5 text-center text-xs font-bold text-fuchsia-100"
          >
            Tip profile
          </Link>
          <a
            href={`https://basescan.org/address/${data.address}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/12 py-2.5 text-center text-xs font-bold text-slate-200"
          >
            BaseScan ↗
          </a>
        </div>
        <p className="text-center text-[10px] text-slate-600">
          Heuristic onchain snapshot · not financial advice
        </p>
      </footer>
    </article>
  );
}
