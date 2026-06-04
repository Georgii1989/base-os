"use client";

import { useState } from "react";
import type { BridgeChainId } from "@/lib/bridgeChains";
import { getBridgeChain } from "@/lib/bridgeChains";
import { BRIDGE_CHAIN_ACCENT, bridgeChainLogoSources } from "@/lib/bridgeChainLogos";

export function BridgeChainIcon({
  chainId,
  size = 36,
}: {
  chainId: BridgeChainId;
  size?: number;
}) {
  const chain = getBridgeChain(chainId);
  const sources = bridgeChainLogoSources(chainId);
  const accent = BRIDGE_CHAIN_ACCENT[chainId];
  const label = chain?.shortName ?? chain?.name ?? "?";
  const [srcIndex, setSrcIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const src = sources[srcIndex];
  const showLogo = Boolean(src) && !imgFailed;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-white/12"
      style={{ width: size, height: size }}
      title={chain?.name}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={chain?.name ?? "Chain"}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => {
            if (srcIndex < sources.length - 1) {
              setSrcIndex((i) => i + 1);
            } else {
              setImgFailed(true);
            }
          }}
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br font-black ${accent}`}
          style={{ fontSize: size * 0.32 }}
        >
          {label.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
