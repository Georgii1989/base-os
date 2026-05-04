import { CrazyVikaGame } from '@/components/CrazyVikaGame';

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#070313] px-3 py-4 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,0.25),transparent_35%),radial-gradient(circle_at_75%_30%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_55%_80%,rgba(236,72,153,0.20),transparent_40%)]" />
      <CrazyVikaGame />
    </main>
  );
}
