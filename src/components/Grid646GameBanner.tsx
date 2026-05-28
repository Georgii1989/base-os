"use client";

const RAINBOW = [
  "#ff5c7a",
  "#ff9f43",
  "#ffd93d",
  "#6bcb77",
  "#4d96ff",
  "#9b5de5",
  "#f15bb5",
] as const;

function RainbowTitle({ text }: { text: string }) {
  return (
    <span className="inline leading-tight" aria-label={text}>
      {text.split("").map((char, i) => {
        if (char === " ") {
          return <span key={`sp-${i}`} className="inline-block w-[0.35em]" />;
        }
        const color = RAINBOW[i % RAINBOW.length];
        return (
          <span
            key={`${i}-${char}`}
            className="grid646-rainbow-char inline-block font-black"
            style={{
              color,
              animationDelay: `${(i % 7) * 0.08}s`,
              textShadow: `0 0 18px ${color}55, 0 2px 0 rgba(0,0,0,0.35)`,
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

export function Grid646GameBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-600/25 via-violet-900/50 to-cyan-500/25 p-6 shadow-[0_0_40px_rgba(236,72,153,0.15)]">
      <div
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-cyan-400/25 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-24 w-48 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl"
        aria-hidden
      />

      <p className="relative text-[11px] font-black uppercase tracking-[0.4em] text-fuchsia-200">
        <span className="mr-2 inline-block animate-pulse">★</span>
        Arcade
        <span className="ml-2 inline-block animate-pulse">★</span>
      </p>

      <h2 className="relative mt-3 text-[1.65rem] leading-snug sm:text-[1.85rem]">
        <RainbowTitle text="Grid 6×6" />
        <span className="mx-1.5 inline-block text-white/50">·</span>
        <RainbowTitle text="Four in a row" />
      </h2>

      <p className="relative mt-4 text-sm leading-relaxed text-white/85">
        Create a <strong className="text-yellow-300">room</strong>, share the number, or pick one from
        the list.{" "}
        <strong className="font-mono text-amber-300">1/0</strong>
        <span className="text-white/60"> = waiting</span>
        <span className="text-white/40"> · </span>
        <strong className="font-mono text-emerald-300">1/1</strong>
        <span className="text-white/60"> = full</span>
      </p>
    </section>
  );
}
