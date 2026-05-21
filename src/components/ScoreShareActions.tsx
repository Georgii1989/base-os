"use client";

import { useCallback, useState } from "react";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";
import {
  buildScoreSharePageUrl,
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

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("png_export_failed"));
    }, "image/png");
  });
}

export function ScoreShareActions({ data }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? buildScoreSharePageUrl(data.address, window.location.origin)
      : buildScoreSharePageUrl(data.address);

  const run = useCallback(
    async (action: "download" | "copy" | "link" | "native") => {
      setBusy(true);
      setStatus(null);
      try {
        if (action === "link") {
          await navigator.clipboard.writeText(shareUrl);
          setStatus("Link copied — paste in your post.");
          return;
        }

        const canvas = renderScoreShareCard(toCardInput(data), window.location.origin);
        const blob = await canvasToPngBlob(canvas);
        const file = new File([blob], `base-os-score-${data.score.grade}.png`, {
          type: "image/png",
        });

        if (action === "download") {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          setStatus("Image saved.");
          return;
        }

        if (action === "copy") {
          if (!navigator.clipboard?.write) throw new Error("clipboard_unavailable");
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setStatus("Image copied — paste into X or Telegram.");
          return;
        }

        if (action === "native" && typeof navigator !== "undefined" && navigator.share) {
          try {
            await navigator.share({
              title: `Base OS · Onchain score ${data.score.score}`,
              text: `Grade ${data.score.grade} on Base — check this wallet`,
              url: shareUrl,
              files: [file],
            });
            setStatus("Shared.");
            return;
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
          }
        }

        await navigator.clipboard.writeText(shareUrl);
        setStatus("Share with image unavailable here — link copied instead.");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Could not share.");
      } finally {
        setBusy(false);
      }
    },
    [data, shareUrl]
  );

  return (
    <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-fuchsia-500/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/90">
            Share score card
          </p>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            PNG for X / Telegram: score, grade, and top metrics. Address is shortened on the card.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("download")}
          className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-fuchsia-500/80 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          Download PNG
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("copy")}
          className="rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-100 disabled:opacity-50"
        >
          Copy image
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("link")}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-200 disabled:opacity-50"
        >
          Copy link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("native")}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-200 disabled:opacity-50"
        >
          Share…
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-cyan-100/90">{status}</p> : null}
    </section>
  );
}
