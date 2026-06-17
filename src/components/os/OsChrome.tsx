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
      <h2 className="os-display mt-2 text-2xl md:text-3xl">{title}</h2>
      {subtitle ? <p className="text-champagne mt-2 text-sm">{subtitle}</p> : null}
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
    <div className="os-subtabs flex rounded-[5px] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`os-subtab flex-1 cursor-pointer rounded-[5px] px-2 py-2.5 text-[11px] font-medium transition-colors duration-200 sm:text-xs ${
            active === tab.id ? "os-subtab-active" : "text-[var(--color-champagne)] hover:text-[var(--color-pearl-warm)]"
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
    accent === "violet" || accent === "gold"
      ? "text-[var(--color-lavender-accent)]"
      : "text-[var(--color-lilac-white)]";

  return (
    <div className="os-metric-tile">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-fog)]">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--color-ash)]">{hint}</p> : null}
    </div>
  );
}

export const osInputClass =
  "os-input w-full rounded-[5px] border border-[rgba(145,142,160,0.15)] bg-[var(--color-midnight-surface)] px-4 py-3 text-sm text-[var(--color-lilac-white)] placeholder:text-[var(--color-fog)] focus:border-[rgba(147,130,255,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(147,130,255,0.25)]";

export const osSelectClass =
  "os-input w-full cursor-pointer rounded-[5px] border border-[rgba(145,142,160,0.15)] bg-[var(--color-midnight-surface)] px-4 py-3 text-sm text-[var(--color-lilac-white)] focus:border-[rgba(147,130,255,0.4)] focus:outline-none";

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
