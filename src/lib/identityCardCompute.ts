import { getAddress, isAddress } from "viem";
import { resolveProtocolLabel, shortenAddressDisplay } from "@/lib/knownBaseProtocols";
import type { BasescanNormalTx } from "@/lib/basescanAccountTx";
import { normalizeHexAddrField } from "@/lib/basescanAccountTx";

export type TopProtocolHit = {
  address: `0x${string}`;
  label: string;
  txs: number;
  kind: "known" | "contract" | "wallet";
};

function hasContractInput(tx: BasescanNormalTx): boolean {
  const input = (tx.input ?? "").trim().toLowerCase();
  return input.length > 2 && input !== "0x";
}

function isContractCreationRow(tx: BasescanNormalTx): boolean {
  const to = (tx.to ?? "").trim();
  return to === "" || to === "0x";
}

export function computeTopProtocolsFromTxList(
  txs: BasescanNormalTx[],
  watcherLower: string,
  limit = 8
): TopProtocolHit[] {
  const counts = new Map<string, number>();

  for (const tx of txs) {
    const from = normalizeHexAddrField(tx.from);
    if (from !== watcherLower) continue;
    if (isContractCreationRow(tx)) continue;

    const toRaw = normalizeHexAddrField(tx.to);
    if (!toRaw || !isAddress(toRaw)) continue;

    const key = toRaw.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return sorted.map(([addr, txsCount]) => {
    const checksum = getAddress(addr);
    const known = resolveProtocolLabel(addr);
    const contractLike = txs.some(
      (t) =>
        normalizeHexAddrField(t.from) === watcherLower &&
        normalizeHexAddrField(t.to) === addr &&
        hasContractInput(t)
    );

    let kind: TopProtocolHit["kind"] = "wallet";
    let label = known || shortenAddressDisplay(checksum);

    if (known) {
      kind = "known";
      label = known;
    } else if (contractLike) {
      kind = "contract";
      label = shortenAddressDisplay(checksum);
    }

    return { address: checksum, label, txs: txsCount, kind };
  });
}
