"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SwapPanel } from "@/components/SwapPanel";
import { BridgeRelayPanel } from "@/components/BridgeRelayPanel";
import { OsPageHeader, OsSubTabs } from "@/components/os/OsChrome";
import { parseSwapPrefillParams } from "@/lib/swapPrefill";

type PanelMode = "swap" | "bridge";

export function SwapBridgePanel() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<PanelMode>("swap");

  useEffect(() => {
    if (parseSwapPrefillParams(searchParams)) setMode("swap");
  }, [searchParams]);

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <OsPageHeader
        eyebrow="Trade"
        title="Swap & Bridge"
        subtitle="Swap on Base · cross-chain bridge via Relay"
      />

      <OsSubTabs
        tabs={[
          { id: "swap" as const, label: "Swap on Base" },
          { id: "bridge" as const, label: "Bridge" },
        ]}
        active={mode}
        onChange={setMode}
      />

      {mode === "swap" ? <SwapPanel embedded /> : null}
      {mode === "bridge" ? <BridgeRelayPanel /> : null}
    </div>
  );
}
