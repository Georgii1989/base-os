"use client";

import type { Address } from "viem";
import { useBasename } from "@/hooks/useBasename";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";

type Props = {
  address: Address;
  /** Show full checksum below the basename line. */
  showChecksum?: boolean;
  className?: string;
  monoClassName?: string;
};

export function OsAddressDisplay({
  address,
  showChecksum = false,
  className = "",
  monoClassName = "font-mono text-sm text-slate-400",
}: Props) {
  const { data: basename, isLoading } = useBasename(address);

  return (
    <div className={className}>
      {basename ? (
        <p className="font-semibold text-amber-100">{basename}</p>
      ) : isLoading ? (
        <p className="text-sm text-slate-500">Resolving name…</p>
      ) : null}
      <p className={monoClassName} title={address}>
        {showChecksum ? address : shortenAddressDisplay(address)}
      </p>
    </div>
  );
}
