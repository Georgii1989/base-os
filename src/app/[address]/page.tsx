import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { TipProfileCard } from "@/components/TipProfileCard";
import { OsStandaloneBackdrop } from "@/components/os/OsChrome";

type ProfilePageProps = {
  params: Promise<{ address: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { address } = await params;

  if (!isAddress(address)) {
    notFound();
  }

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--os-void)] px-3 py-4 md:px-8">
      <OsStandaloneBackdrop />
      <div className="relative z-[1] w-full">
        <TipProfileCard address={address} />
      </div>
    </main>
  );
}
