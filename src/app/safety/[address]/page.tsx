import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
import type { PublicSafetyPayload } from "@/components/PublicAddressReport";
import { PublicAddressReport } from "@/components/PublicAddressReport";
import { OsStandaloneBackdrop } from "@/components/os/OsStandaloneBackdrop";

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
    <main className="relative flex min-h-[100dvh] flex-col bg-[var(--os-void)] px-4 py-8 md:px-10 lg:py-14">
      <OsStandaloneBackdrop />

      <div className="relative z-[1] mx-auto w-full max-w-5xl px-1">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="os-eyebrow text-[11px]">Base OS · lookup</p>
            <p className="os-display mt-3 text-xl font-semibold text-white md:text-3xl">Address snapshot</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="os-cta-ghost px-4 py-2 text-xs uppercase tracking-[0.15em]">
              Home
            </Link>
            <Link href="/safety" className="os-cta px-4 py-2 text-xs uppercase tracking-[0.15em]">
              New lookup
            </Link>
          </div>
        </div>

        <PublicAddressReport data={payload} />
      </div>
    </main>
  );
}
