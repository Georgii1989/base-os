import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { IdentityCard } from "@/components/IdentityCard";
import { OsStandaloneBackdrop } from "@/components/os/OsChrome";
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
    const checksum = getAddress(address);
    const short = `${checksum.slice(0, 6)}…${checksum.slice(-4)}`;
    const title = `Base identity · ${short} · Grade ${data.score.grade}`;
    const description = `Onchain score ${data.score.score} on Base — ${data.score.metrics.activeDays} active days.`;
    const ogPath = `/card/${checksum}/opengraph-image`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `/card/${checksum}`,
        images: [
          {
            url: ogPath,
            width: 1200,
            height: 630,
            alt: `Onchain score ${data.score.score} · Grade ${data.score.grade}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogPath],
      },
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
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--os-void)] px-4 py-10 md:px-8">
      <OsStandaloneBackdrop />

      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="os-cta-ghost px-3 py-1.5 text-xs">
            ← Base OS
          </Link>
          <Link href={`/?tab=score&address=${data.address}`} className="os-cta-ghost px-3 py-1.5 text-xs">
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
