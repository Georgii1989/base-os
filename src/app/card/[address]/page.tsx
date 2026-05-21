import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isAddress } from "viem";
import { IdentityCard } from "@/components/IdentityCard";
import { fetchOnchainScore } from "@/lib/onchainScoreFetch";

type PageProps = { params: Promise<{ address: string }> };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { address } = await params;
  if (!isAddress(address)) return { title: "Identity card" };

  try {
    const data = await fetchOnchainScore(address);
    if (!data) return { title: "Identity card" };
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    return {
      title: `Base identity · ${short} · Grade ${data.score.grade}`,
      description: `Onchain score ${data.score.score} on Base — ${data.score.metrics.activeDays} active days.`,
    };
  } catch {
    return { title: "Identity card · Base OS" };
  }
}

export default async function IdentityCardPage({ params }: PageProps) {
  const { address } = await params;
  if (!isAddress(address)) notFound();

  let data;
  try {
    data = await fetchOnchainScore(address);
  } catch {
    notFound();
  }
  if (!data) notFound();

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#070313] px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,0.22),transparent_40%),radial-gradient(circle_at_75%_30%,rgba(34,211,238,0.15),transparent_40%)]" />

      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-white"
          >
            ← Base OS
          </Link>
          <Link
            href={`/?tab=score&address=${data.address}`}
            className="text-xs font-bold text-cyan-300/90 hover:text-cyan-100"
          >
            Full score ↗
          </Link>
        </div>

        <IdentityCard data={data} />

        {data.message ? (
          <p className="mt-4 text-center text-xs text-amber-200/80">{data.message}</p>
        ) : null}
      </div>
    </main>
  );
}
