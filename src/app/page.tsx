import type { Metadata } from "next";
import { BaseOsShell } from "@/components/BaseOsShell";
import { buildOsDeepLinkMetadata } from "@/lib/osDeepLinkMetadata";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string; address?: string; room?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  return buildOsDeepLinkMetadata(sp.tab, sp.address, sp.room);
}

export default function Home() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[var(--color-void-canvas)]">
      <BaseOsShell />
    </div>
  );
}
