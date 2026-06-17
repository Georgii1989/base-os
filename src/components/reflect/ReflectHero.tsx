import type { OsTabId } from "@/lib/osTabs";
import { TAB_HERO_SUBTITLES } from "@/lib/reflectModules";

type Props = {
  activeTab: OsTabId;
  activeLabel: string;
  isEmbed?: boolean;
};

export function ReflectHero({ activeTab, activeLabel, isEmbed = false }: Props) {
  const isHome = activeTab === "home";
  const subtitle =
    TAB_HERO_SUBTITLES[activeTab] ??
    "One interface for everything on Base — swap, score, play, and protect.";

  return (
    <header className="reflect-hero mx-auto flex max-w-[720px] flex-col items-center px-4 pt-8 text-center md:pt-12">
      <span className="reflect-badge-pill">
        <span aria-hidden>✦</span>
        {isEmbed ? "Base App · compact" : "Agent-ready · Base onchain OS"}
      </span>

      {isHome ? (
        <>
          <h1 className="os-display mt-8 text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.11] tracking-[-0.02em]">
            <span className="text-pearl-warm">Operate better with </span>
            <span className="text-cosmic-gradient">Base OS</span>
          </h1>
          <p className="text-champagne mt-5 max-w-xl text-lg leading-[1.56]">{subtitle}</p>
        </>
      ) : (
        <>
          <h1 className="os-display mt-8 text-[clamp(1.75rem,4vw,3rem)] leading-[1.17]">
            <span className="text-cosmic-gradient">{activeLabel}</span>
          </h1>
          {!isEmbed ? (
            <p className="text-champagne mt-4 max-w-xl text-base leading-[1.5]">{subtitle}</p>
          ) : null}
        </>
      )}
    </header>
  );
}
