type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
};

export function ReflectSectionHeader({ eyebrow, title, subtitle, align = "center" }: Props) {
  const alignClass = align === "center" ? "text-center mx-auto max-w-[640px]" : "text-left max-w-xl";
  return (
    <header className={alignClass}>
      {eyebrow ? <p className="os-eyebrow">{eyebrow}</p> : null}
      <h2 className="os-display mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)] leading-[1.2]">{title}</h2>
      {subtitle ? <p className="text-champagne mt-3 text-base leading-[1.56]">{subtitle}</p> : null}
    </header>
  );
}
