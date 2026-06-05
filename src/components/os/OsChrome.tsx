import type { ReactNode } from "react";

export function OsPageHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "text-center" : "text-left";
  return (
    <div className={alignCls}>
      <p className="os-eyebrow">{eyebrow}</p>
      <h2 className="os-display mt-2 text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

export function OsSubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="os-subtabs flex rounded-2xl border border-white/[0.08] bg-black/30 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`os-subtab flex-1 cursor-pointer rounded-xl px-2 py-2.5 text-[11px] font-bold transition-colors duration-200 sm:text-xs ${
            active === tab.id ? "os-subtab-active" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function OsMetricTile({
  label,
  value,
  hint,
  accent = "gold",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "gold" | "violet" | "emerald" | "amber" | "rose";
}) {
  const valueColor =
    accent === "violet"
      ? "text-violet-200"
      : accent === "emerald"
        ? "text-emerald-200"
        : accent === "amber"
          ? "text-amber-200"
          : accent === "rose"
            ? "text-rose-200"
            : "text-amber-100";

  return (
    <div className="os-metric-tile">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export const osInputClass =
  "os-input w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none focus:ring-1 focus:ring-violet-400/25";

export const osSelectClass =
  "os-input w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-violet-400/40 focus:outline-none";

export function OsPanelSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`os-panel p-5 ${className}`.trim()}>{children}</section>;
}

export function OsPrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`os-cta os-display cursor-pointer ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function OsGhostButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`os-cta-ghost cursor-pointer ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

/** Shared OLED backdrop for standalone routes (/safety, /card, tips, etc.) */
export function OsStandaloneBackdrop() {
  return (
    <>
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
    </>
  );
}
