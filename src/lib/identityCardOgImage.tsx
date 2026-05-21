import { ImageResponse } from "next/og";
import { isAddress } from "viem";
import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";
import { fetchOnchainScore } from "@/lib/onchainScoreFetch";

export const OG_SIZE = { width: 1200, height: 630 };

function gradeColor(grade: string): string {
  if (grade === "A") return "#34d399";
  if (grade === "B") return "#22d3ee";
  if (grade === "C") return "#fbbf24";
  return "#94a3b8";
}

function fallbackOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(160deg, #020617 0%, #1e1b4b 100%)",
          padding: 64,
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: "#67e8f9" }}>BASE OS</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", marginTop: 16 }}>
          Onchain identity
        </div>
        <div style={{ fontSize: 28, color: "#94a3b8", marginTop: 20 }}>
          Check any wallet on Base
        </div>
      </div>
    ),
    OG_SIZE
  );
}

export async function generateIdentityCardOgImage(addressRaw: string): Promise<ImageResponse> {
  if (!isAddress(addressRaw)) return fallbackOgImage();

  let data;
  try {
    data = await fetchOnchainScore(addressRaw);
  } catch {
    return fallbackOgImage();
  }
  if (!data) return fallbackOgImage();

  const m = data.score.metrics;
  const short = shortenAddressDisplay(data.address);
  const top = data.topProtocols.slice(0, 3);
  const accent = gradeColor(data.score.grade);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(145deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)",
          padding: 56,
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#67e8f9" }}>
              BASE OS
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8 }}>Onchain identity</div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#a5f3fc",
                marginTop: 12,
                fontFamily: "monospace",
              }}
            >
              {short}
            </div>
            <div style={{ fontSize: 20, color: "#94a3b8", marginTop: 8 }}>
              {data.isContract ? "Contract" : "Wallet"} on Base · {m.activeDays} active days
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 200,
              height: 200,
              borderRadius: 100,
              border: "10px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}>{data.score.score}</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: accent,
                marginTop: 4,
                letterSpacing: "0.12em",
              }}
            >
              GRADE {data.score.grade}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: 20,
              borderRadius: 16,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontSize: 16, color: "#64748b", fontWeight: 600 }}>OUTGOING</div>
            <div style={{ fontSize: 36, fontWeight: 900, marginTop: 6 }}>
              {formatCompactNumber(m.outgoingTxs)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: 20,
              borderRadius: 16,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontSize: 16, color: "#64748b", fontWeight: 600 }}>CONTRACTS</div>
            <div style={{ fontSize: 36, fontWeight: 900, marginTop: 6 }}>
              {formatCompactNumber(m.uniqueContractsTouched)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: 20,
              borderRadius: 16,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontSize: 16, color: "#64748b", fontWeight: 600 }}>BRIDGES</div>
            <div style={{ fontSize: 36, fontWeight: 900, marginTop: 6 }}>
              {formatCompactNumber(m.bridgeTxs)}
            </div>
          </div>
        </div>

        {top.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
            <div style={{ fontSize: 16, color: "#64748b", fontWeight: 700, letterSpacing: "0.1em" }}>
              TOP TOUCHPOINTS
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              {top.map((p) => (
                <div
                  key={p.address}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "12px 18px",
                    borderRadius: 12,
                    background: "rgba(34,211,238,0.12)",
                    border: "1px solid rgba(34,211,238,0.25)",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontSize: 16, color: "#94a3b8", marginTop: 4 }}>{p.txs} txs</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ fontSize: 18, color: "#64748b", marginTop: "auto" }}>
          app-base-os.vercel.app · heuristic score · not financial advice
        </div>
      </div>
    ),
    OG_SIZE
  );
}
