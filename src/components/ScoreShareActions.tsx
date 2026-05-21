"use client";

import { useCallback, useState } from "react";
import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";
import {
  buildScoreTabShareUrl,
  buildScoreTweetText,
  buildTwitterIntentUrl,
  renderScoreShareCard,
  type ScoreShareCardInput,
} from "@/lib/scoreShareCard";

type Props = {
  data: OnchainScorePayload;
};

function toCardInput(data: OnchainScorePayload): ScoreShareCardInput {
  const m = data.score.metrics;
  return {
    address: data.address,
    score: data.score.score,
    grade: data.score.grade,
    outgoingTxs: m.outgoingTxs,
    uniqueContractsTouched: m.uniqueContractsTouched,
    activeDays: m.activeDays,
    bridgeTxs: m.bridgeTxs,
    deployments: m.deployments,
    firstActivityAt: m.firstActivityAt,
    isContract: data.isContract,
  };
}

async function copyScoreCardImage(data: OnchainScorePayload): Promise<boolean> {
  try {
    const canvas = renderScoreShareCard(toCardInput(data), window.location.origin);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (!blob || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export function ScoreShareActions({ data }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shareOnX = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const shareUrl = buildScoreTabShareUrl(window.location.origin);
      const tweet = buildScoreTweetText(toCardInput(data), shareUrl);
      const intentUrl = buildTwitterIntentUrl(tweet);

      const imageCopied = await copyScoreCardImage(data);

      window.open(intentUrl, "_blank", "noopener,noreferrer,width=550,height=420");

      setStatus(
        imageCopied
          ? "X opened — paste the score card image (Ctrl+V / ⌘V) into your post."
          : "X opened — your score and link are in the tweet. Add a screenshot if you like."
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not open X.");
    } finally {
      setBusy(false);
    }
  }, [data]);

  return (
    <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-fuchsia-500/10 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/90">Share</p>
      <p className="mt-1 max-w-xl text-sm text-slate-300">
        Post your score on X — we open compose with text and link. Score card image is copied when
        your browser allows it.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void shareOnX()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500/90 to-fuchsia-500/80 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
      >
        <span aria-hidden>𝕏</span>
        {busy ? "Opening…" : "Share your score on X"}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        Preview: {data.score.score} · Grade {data.score.grade} ·{" "}
        {formatCompactNumber(data.score.metrics.outgoingTxs)} txs
      </p>
      {status ? <p className="mt-2 text-sm text-cyan-100/90">{status}</p> : null}
    </section>
  );
}
