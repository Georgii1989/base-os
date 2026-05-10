import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import {
  computeStatsFromTxList,
  fetchAddressTxListAll,
} from "@/lib/basescanAccountTx";

export const maxDuration = 60;

type Body = { addresses?: unknown };

/** Extra on-chain stats for watchlist (Basescan txlist). Requires BASESCAN_API_KEY. */
export async function POST(request: Request) {
  const apiKey =
    process.env.BASESCAN_API_KEY?.trim() || process.env.ETHERSCAN_API_KEY?.trim() || "";
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "missing_api_key" as const,
        byAddress: {} as Record<
          string,
          {
            deployments: number;
            uniqueSendTargets: number;
            txsAnalyzed: number;
            capped: boolean;
          }
        >,
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
      }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const raw = body.addresses;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ ok: false, error: "addresses_array" }, { status: 400 });
  }

  const normalized: `0x${string}`[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !isAddress(item)) continue;
    const checksum = getAddress(item);
    const k = checksum.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    normalized.push(checksum);
    if (normalized.length >= 48) break;
  }

  if (normalized.length === 0) {
    return NextResponse.json({ ok: true, byAddress: {} });
  }

  const byAddress: Record<
    string,
    {
      deployments: number;
      uniqueSendTargets: number;
      txsAnalyzed: number;
      capped: boolean;
      source: "ok" | "error";
    }
  > = {};

  await Promise.all(
    normalized.map(async (address) => {
      try {
        const { txs, capped } = await fetchAddressTxListAll(address, apiKey, {
          maxTxs: 25_000,
          offset: 1000,
        });
        const stats = computeStatsFromTxList(txs, address.toLowerCase());
        byAddress[address.toLowerCase()] = {
          deployments: stats.deployments,
          uniqueSendTargets: stats.uniqueSendTargets,
          txsAnalyzed: stats.txsAnalyzed,
          capped,
          source: "ok" as const,
        };
      } catch {
        byAddress[address.toLowerCase()] = {
          deployments: 0,
          uniqueSendTargets: 0,
          txsAnalyzed: 0,
          capped: false,
          source: "error" as const,
        };
      }
    })
  );

  return NextResponse.json(
    { ok: true as const, byAddress },
    {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    }
  );
}
