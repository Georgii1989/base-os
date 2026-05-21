import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";

export const SCORE_SHARE_CARD_WIDTH = 1200;
export const SCORE_SHARE_CARD_HEIGHT = 630;

export type ScoreShareCardInput = {
  address: string;
  score: number;
  grade: string;
  outgoingTxs: number;
  uniqueContractsTouched: number;
  activeDays: number;
  bridgeTxs: number;
  deployments: number;
  firstActivityAt: number | null;
  isContract: boolean;
};

export function shortenAddress(address: string): string {
  const t = address.trim();
  if (t.length <= 13) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

/** Public link for tweets — opens score tab without exposing a wallet address. */
export function buildScoreTabShareUrl(appOrigin?: string): string {
  const base = (appOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app-base-os.vercel.app").replace(
    /\/$/,
    ""
  );
  return `${base}/?tab=score`;
}

export function buildIdentityCardUrl(address: string, appOrigin?: string): string {
  const base = (appOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app-base-os.vercel.app").replace(
    /\/$/,
    ""
  );
  return `${base}/card/${address}`;
}

export function buildScoreTweetText(input: ScoreShareCardInput, shareUrl: string): string {
  return [
    `My Base onchain score: ${input.score} (Grade ${input.grade})`,
    `${formatCompactNumber(input.outgoingTxs)} outgoing txs · ${formatCompactNumber(input.uniqueContractsTouched)} contracts · ${formatCompactNumber(input.activeDays)} active days`,
    "",
    "Check any wallet on Base OS 👇",
    shareUrl,
  ].join("\n");
}

/** Opens X (Twitter) compose with pre-filled tweet. */
export function buildTwitterIntentUrl(tweetText: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
}

function formatSince(ts: number | null): string {
  if (ts == null) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function gradeAccent(grade: string): string {
  if (grade === "A") return "#34d399";
  if (grade === "B") return "#22d3ee";
  if (grade === "C") return "#fbbf24";
  return "#94a3b8";
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawScoreRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  score: number,
  grade: string
) {
  const radius = 88;
  const start = -Math.PI / 2;
  const sweep = (Math.min(100, Math.max(0, score)) / 100) * Math.PI * 2;

  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  grad.addColorStop(0, "#22d3ee");
  grad.addColorStop(1, "#e879f9");
  ctx.strokeStyle = grad;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, start + sweep);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 72px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(String(score), cx, cy + 18);
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = gradeAccent(grade);
  ctx.fillText(`GRADE ${grade}`, cx, cy + 52);
}

function drawMetricBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  hint: string
) {
  drawRoundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(label.toUpperCase(), x + 20, y + 36);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 40px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(value, x + 20, y + 82);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(hint, x + 20, y + 108);
}

/** Renders a PNG-ready score card to an offscreen canvas. */
export function renderScoreShareCard(
  input: ScoreShareCardInput,
  appOrigin?: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SCORE_SHARE_CARD_WIDTH;
  canvas.height = SCORE_SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const bg = ctx.createLinearGradient(0, 0, SCORE_SHARE_CARD_WIDTH, SCORE_SHARE_CARD_HEIGHT);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.55, "#0f172a");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SCORE_SHARE_CARD_WIDTH, SCORE_SHARE_CARD_HEIGHT);

  ctx.strokeStyle = "rgba(34,211,238,0.35)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, 24, 24, SCORE_SHARE_CARD_WIDTH - 48, SCORE_SHARE_CARD_HEIGHT - 48, 28);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(34,211,238,0.9)";
  ctx.font = "800 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("BASE OS", 56, 72);
  ctx.fillStyle = "#f5f3ff";
  ctx.font = "900 52px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Onchain score", 56, 132);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 22px ui-sans-serif, system-ui, sans-serif";
  const walletKind = input.isContract ? "Contract on Base" : "Wallet on Base";
  ctx.fillText(
    `${shortenAddress(input.address)} · ${walletKind} · since ${formatSince(input.firstActivityAt)}`,
    56,
    168
  );

  drawScoreRing(ctx, 220, 360, input.score, input.grade);

  const metricsX = 400;
  const metricsY = 220;
  const boxW = 360;
  const boxH = 120;
  const gap = 16;

  drawMetricBox(
    ctx,
    metricsX,
    metricsY,
    boxW,
    boxH,
    "Outgoing txs",
    formatCompactNumber(input.outgoingTxs),
    "Activity on Base"
  );
  drawMetricBox(
    ctx,
    metricsX + boxW + gap,
    metricsY,
    boxW,
    boxH,
    "Contracts",
    formatCompactNumber(input.uniqueContractsTouched),
    "Unique touched"
  );
  drawMetricBox(
    ctx,
    metricsX,
    metricsY + boxH + gap,
    boxW,
    boxH,
    "Active days",
    formatCompactNumber(input.activeDays),
    "Indexed history"
  );
  drawMetricBox(
    ctx,
    metricsX + boxW + gap,
    metricsY + boxH + gap,
    boxW,
    boxH,
    "Bridges",
    formatCompactNumber(input.bridgeTxs),
    `${formatCompactNumber(input.deployments)} deploys`
  );

  const shareUrl = buildScoreTabShareUrl(appOrigin);
  ctx.textAlign = "left";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "600 20px ui-monospace, monospace";
  ctx.fillText(shareUrl, 56, SCORE_SHARE_CARD_HEIGHT - 56);
  ctx.fillStyle = "#64748b";
  ctx.font = "500 16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Heuristic score · not financial advice", 56, SCORE_SHARE_CARD_HEIGHT - 28);

  return canvas;
}
