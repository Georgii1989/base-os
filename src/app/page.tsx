import type { Metadata } from "next";
import { BaseOsShell } from "@/components/BaseOsShell";
import { buildOsDeepLinkMetadata } from "@/lib/osDeepLinkMetadata";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string; address?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  return buildOsDeepLinkMetadata(sp.tab, sp.address);
}

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] w-full items-start justify-center overflow-hidden bg-[var(--os-void)] px-3 py-4 md:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 15% 8%, rgba(245, 158, 11, 0.14), transparent 52%),
            radial-gradient(ellipse 70% 50% at 88% 12%, rgba(139, 92, 246, 0.16), transparent 48%),
            radial-gradient(ellipse 60% 45% at 50% 95%, rgba(109, 40, 217, 0.12), transparent 50%),
            radial-gradient(ellipse 40% 30% at 72% 68%, rgba(251, 191, 36, 0.06), transparent 45%)
          `,
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-amber-500/10 blur-[100px] os-animate-drift" />
      <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-violet-600/12 blur-[90px] os-animate-drift-slow" />
      <div
        className="pointer-events-none absolute bottom-16 left-1/4 h-64 w-64 rounded-full bg-violet-500/8 blur-[80px] os-animate-drift [animation-delay:5s]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 15%, black, transparent)",
        }}
      />
      <div className="os-grain" aria-hidden />
      <BaseOsShell />
    </main>
  );
}
