import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
import type { PublicSafetyPayload } from "@/components/PublicAddressReport";
import { PublicAddressReport } from "@/components/PublicAddressReport";

type PageProps = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { address } = await params;
  if (!isAddress(address)) return { title: "Lookup" };
  const checksum = getAddress(address);
  return {
    title: `Base · ${checksum.slice(0, 10)}…`,
    description: `Read-only snapshot for ${checksum.slice(0, 8)}…`,
  };
}

export default async function SafetyAddressPage({ params }: PageProps) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  const checksum = getAddress(address);
  const client = getBasePublicClient();

  const [bytecodeRaw, balance, txCount] = await Promise.all([
    client.getBytecode({ address: checksum }),
    client.getBalance({ address: checksum }),
    client.getTransactionCount({ address: checksum }),
  ]);

  const bytecode = bytecodeRaw ?? "0x";
  const isContract = bytecode !== "0x" && bytecode.length > 2;
  const bytecodeBytes = isContract ? (bytecode.length - 2) / 2 : 0;

  const payload: PublicSafetyPayload = {
    checksum,
    isContract,
    bytecodeBytes,
    balanceWei: balance.toString(),
    txCount,
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-[#070313] px-4 py-8 md:px-10 lg:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,0.25),transparent_35%),radial-gradient(circle_at_75%_30%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_55%_80%,rgba(236,72,153,0.20),transparent_40%)]" />

      <div className="relative z-[1] mx-auto w-full max-w-5xl px-1">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-cyan-200/85">Base OS · lookup</p>
            <p className="mt-3 text-xl font-black text-white md:text-3xl">
              Address snapshot
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-2xl border border-white/12 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-200 hover:border-white/35"
            >
              Home
            </Link>
            <Link
              href="/safety"
              className="rounded-2xl border border-cyan-300/55 bg-gradient-to-br from-cyan-500/15 to-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-cyan-100"
            >
              New lookup
            </Link>
          </div>
        </div>

        <PublicAddressReport data={payload} />
      </div>
    </main>
  );
}
