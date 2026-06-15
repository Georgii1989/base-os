import { ImageResponse } from "next/og";
import { OG_SIZE } from "@/lib/identityCardOgImage";

export type GameInviteKind = "grid646" | "battleship";

export function parseGameInviteTab(tab: string | null | undefined): GameInviteKind | null {
  if (tab === "game") return "grid646";
  if (tab === "battleship") return "battleship";
  return null;
}

export function gameInviteLabel(kind: GameInviteKind): string {
  return kind === "grid646" ? "Grid 6×6" : "Battleship 10×10";
}

export function generateGameInviteOgImage(kind: GameInviteKind, room: string): ImageResponse {
  const title = gameInviteLabel(kind);
  const accent = kind === "grid646" ? "#f472b6" : "#22d3ee";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "linear-gradient(155deg, #020617 0%, #1e1b4b 55%, #0f172a 100%)",
          padding: 64,
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fbbf24", letterSpacing: "0.2em" }}>
          BASE OS
        </div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700, color: accent }}>{title}</div>
          <div style={{ fontSize: 96, fontWeight: 900, color: "#fff", marginTop: 12 }}>
            Room #{room}
          </div>
          <div style={{ fontSize: 30, color: "#94a3b8", marginTop: 20 }}>
            Join the onchain 1v1 match on Base
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#64748b" }}>app-base-os.vercel.app</div>
      </div>
    ),
    OG_SIZE
  );
}
