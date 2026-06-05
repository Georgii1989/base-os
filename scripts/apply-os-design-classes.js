/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "src", "components");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Safe class-string swaps — panel shells & metric tiles only */
const REPLACEMENTS = [
  [
    "rounded-3xl border border-white/10 bg-slate-950/50 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-3xl border border-white/15 bg-slate-950/55 p-6",
    "os-panel p-6",
  ],
  [
    "rounded-3xl border border-white/15 bg-slate-950/55 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-3xl border border-cyan-300/25 bg-slate-950/55 p-6 md:p-8",
    "os-panel p-6 md:p-8",
  ],
  [
    "rounded-3xl border border-cyan-300/25 bg-slate-950/55 p-5 md:p-6",
    "os-panel p-5 md:p-6",
  ],
  [
    "rounded-3xl border border-cyan-300/20 bg-slate-950/50 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-3xl border border-fuchsia-300/20 bg-slate-950/50 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-3xl border border-fuchsia-300/20 bg-slate-950/50 p-6",
    "os-panel p-6",
  ],
  [
    "rounded-3xl border border-amber-300/20 bg-slate-950/50 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-3xl border border-emerald-300/25 bg-emerald-500/10 p-5",
    "os-panel border-emerald-400/20 p-5",
  ],
  [
    "rounded-2xl border border-white/10 bg-black/35 p-4",
    "os-metric-tile",
  ],
  [
    "rounded-3xl border border-white/15 bg-black/35 p-4 text-white shadow-[0_0_60px_rgba(76,29,149,0.45)] backdrop-blur-xl",
    "os-panel p-4",
  ],
  [
    "rounded-3xl border border-white/10 bg-slate-950/50 p-4",
    "os-panel p-4",
  ],
  [
    "rounded-3xl border border-white/10 bg-slate-950/40 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-3xl border border-white/8 bg-slate-950/40 p-5",
    "os-panel p-5",
  ],
  [
    "rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50",
    "os-input font-mono outline-none",
  ],
  [
    "rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50",
    "os-input outline-none",
  ],
  [
    "rounded-2xl bg-gradient-to-r from-cyan-500/90 to-fuchsia-500/80 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40",
    "os-cta os-display px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40",
  ],
  [
    "flex rounded-2xl border border-white/10 bg-black/40 p-1",
    "os-subtabs flex p-1",
  ],
  [
    "rounded-3xl border border-white/10 bg-slate-950/50 p-6",
    "os-panel p-6",
  ],
  [
    "rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-emerald-500/10 p-6 md:p-8",
    "os-panel p-6 md:p-8",
  ],
  [
    "relative z-10 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/45 p-5 text-white shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl",
    "os-panel mx-auto w-full max-w-3xl p-5 text-white",
  ],
  [
    "grid gap-3 rounded-2xl border border-cyan-300/30 bg-slate-950/50 p-4",
    "os-panel grid gap-3 p-4",
  ],
  [
    "mt-4 grid gap-3 rounded-2xl border border-fuchsia-300/30 bg-slate-950/50 p-4",
    "mt-4 os-panel grid gap-3 p-4",
  ],
  [
    "grid gap-4 rounded-3xl border border-white/12 bg-black/45 p-5 md:p-7",
    "os-panel grid gap-4 p-5 md:p-7",
  ],
  [
    "rounded-3xl border border-white/12 bg-black/45 p-5 backdrop-blur-sm md:flex md:flex-wrap md:items-end md:gap-4 md:p-6",
    "os-panel p-5 md:flex md:flex-wrap md:items-end md:gap-4 md:p-6",
  ],
  [
    "rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 px-10 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_48px_rgba(99,102,241,0.35)] transition hover:brightness-110 disabled:opacity-45",
    "os-cta os-display px-10 py-3 text-sm uppercase tracking-[0.18em] disabled:opacity-45",
  ],
  [
    "rounded-xl bg-gradient-to-r from-cyan-500/80 to-emerald-500/70 px-5 py-2.5 text-sm font-black text-white",
    "os-cta os-display px-5 py-2.5 text-sm",
  ],
  [
    "rounded-xl bg-cyan-500/80 px-4 py-2 text-sm font-black text-white",
    "os-cta os-display px-4 py-2 text-sm",
  ],
  [
    "mt-4 grid gap-3 rounded-2xl border border-sky-300/30 bg-slate-950/50 p-4 sm:grid-cols-3",
    "mt-4 grid gap-3 sm:grid-cols-3",
  ],
  [
    "mt-4 grid gap-2 rounded-2xl border border-sky-300/30 bg-slate-950/50 p-4",
    "mt-4 os-panel grid gap-2 p-4",
  ],
  [
    "mt-4 grid gap-3 rounded-2xl border border-indigo-300/25 bg-slate-950/50 p-4",
    "mt-4 os-panel grid gap-3 p-4",
  ],
  [
    "mt-4 grid gap-3 rounded-2xl border border-violet-300/30 bg-slate-950/50 p-4",
    "mt-4 os-panel grid gap-3 p-4",
  ],
  [
    "grid gap-3 rounded-2xl border border-violet-300/30 bg-slate-950/50 p-4",
    "os-panel grid gap-3 p-4",
  ],
  [
    "rounded-xl border border-cyan-300/20 bg-black/35 px-2.5 py-2",
    "os-metric-tile px-2.5 py-2",
  ],
  [
    "rounded-xl border border-violet-300/20 bg-black/35 px-2.5 py-2",
    "os-metric-tile px-2.5 py-2",
  ],
  [
    "rounded-xl border border-fuchsia-300/20 bg-black/35 px-2.5 py-2",
    "os-metric-tile px-2.5 py-2",
  ],
];

let total = 0;
for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, text);
    total += 1;
    console.log("updated:", path.relative(process.cwd(), file));
  }
}
console.log(`Done. ${total} files updated.`);
