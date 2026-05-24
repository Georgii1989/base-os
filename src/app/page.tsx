import { BaseOsShell } from "@/components/BaseOsShell";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] w-full items-start justify-center overflow-hidden bg-[#070313] px-3 py-4 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,0.32),transparent_38%),radial-gradient(circle_at_75%_30%,rgba(34,211,238,0.24),transparent_38%),radial-gradient(circle_at_55%_80%,rgba(236,72,153,0.26),transparent_42%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl os-animate-drift" />
      <div className="pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl os-animate-drift-slow" />
      <div className="pointer-events-none absolute bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl os-animate-drift [animation-delay:4s]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 18%, black, transparent)",
        }}
      />
      <BaseOsShell />
    </main>
  );
}
