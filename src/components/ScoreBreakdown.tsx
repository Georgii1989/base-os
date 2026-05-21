"use client";

import { buildScoreBreakdown } from "@/lib/onchainScoreBreakdown";
import type { OnchainScoreMetrics } from "@/lib/onchainScoreCompute";

type Props = {
  metrics: OnchainScoreMetrics;
  tokenTransfers: number | null;
  score: number;
  rpcTxCount?: number;
};

export function ScoreBreakdown({ metrics, tokenTransfers, score, rpcTxCount }: Props) {
  const { items, total } = buildScoreBreakdown(metrics, tokenTransfers, { rpcTxCount });

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-black text-white">Score breakdown</h3>
          <p className="mt-1 text-sm text-slate-400">
            How the {score} / 100 score is built — heuristic weights, not financial advice.
          </p>
        </div>
        <p className="text-sm font-mono text-slate-500">
          Sum ≈ <span className="font-bold text-cyan-200">{total}</span>
        </p>
      </div>

      <ul className="mt-5 space-y-4">
        {items.map((item) => {
          const width = Math.min(100, Math.round((item.points / item.barMax) * 100));
          return (
            <li key={item.id}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-200">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.rawValue}</p>
                </div>
                <p className="shrink-0 text-lg font-black text-cyan-100">+{item.points}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-fuchsia-500/70"
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-600">{item.description}</p>
            </li>
          );
        })}
      </ul>

      {metrics.capped ? (
        <p className="mt-4 text-xs text-amber-200/90">
          History is capped — real activity may score higher than shown.
        </p>
      ) : null}
    </section>
  );
}
