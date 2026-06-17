import type { RadarProject } from "@/lib/radarProjects";
import { RadarProjectIcon } from "@/components/RadarProjectIcon";

export type RadarMarketSlice = {
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  pairUrl: string | null;
};

function formatUsd(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function formatChange(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function riskClass(risk: RadarProject["risk"]) {
  if (risk === "Low") return "border-[rgba(147,130,255,0.35)] text-[var(--color-lavender-accent)]";
  if (risk === "Medium") return "border-[rgba(168,166,183,0.35)] text-[var(--color-ash)]";
  return "border-[rgba(244,160,160,0.35)] text-[#f0b4b4]";
}

type Props = {
  project: RadarProject;
  market?: RadarMarketSlice;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export function RadarProjectCard({ project, market, isFavorite, onToggleFavorite }: Props) {
  const change24h = market?.change24h ?? null;
  const positive = (change24h ?? 0) >= 0;
  const hasLiveMarket = typeof market?.priceUsd === "number";

  return (
    <article className="reflect-feature-card flex h-full flex-col p-3.5">
      <div className="flex items-start gap-2.5">
        <a
          href={project.website}
          target="_blank"
          rel="noreferrer"
          aria-label={`${project.name} website`}
          className="shrink-0 transition hover:opacity-90"
        >
          <RadarProjectIcon iconUrl={project.iconUrl} accent={project.accent} size="card" />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <a
                href={project.website}
                target="_blank"
                rel="noreferrer"
                className="os-display block text-[15px] leading-tight text-[var(--color-lilac-white)] hover:text-[var(--color-lavender-accent)]"
              >
                {project.name}
              </a>
              <p className="mt-0.5 text-[12px] text-[var(--color-fog)]">{project.symbol}</p>
            </div>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${project.name} from favorites` : `Add ${project.name} to favorites`}
              aria-pressed={isFavorite}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-[5px] border text-sm leading-none transition ${
                isFavorite
                  ? "border-[rgba(147,130,255,0.45)] bg-[rgba(16,9,58,0.6)] text-[var(--color-lavender-accent)]"
                  : "border-[rgba(145,142,160,0.2)] text-[var(--color-fog)] hover:border-[rgba(147,130,255,0.35)] hover:text-[var(--color-lilac-white)]"
              }`}
            >
              {isFavorite ? "★" : "☆"}
            </button>
          </div>
          <span
            className={`mt-2 inline-block rounded-[5px] border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${riskClass(project.risk)}`}
          >
            {project.risk} risk
          </span>
        </div>
      </div>

      <p className="mt-3 flex-1 text-[13px] leading-[1.45] text-[var(--color-ash)]">{project.description}</p>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {project.categories.map((category) => (
          <span
            key={category}
            className="rounded-[5px] border border-[rgba(145,142,160,0.12)] bg-[rgba(16,9,58,0.35)] px-1.5 py-0.5 text-[10px] text-[var(--color-fog)]"
          >
            {category}
          </span>
        ))}
      </div>

      {hasLiveMarket ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[5px] border border-[rgba(145,142,160,0.1)] bg-[rgba(3,0,20,0.35)] p-2 text-[11px]">
          <div className="col-span-2">
            <p className="text-[var(--color-fog)]">24h</p>
            <p className={`text-[15px] font-medium tabular-nums ${positive ? "text-[var(--color-lilac-white)]" : "text-[#f0b4b4]"}`}>
              {formatChange(change24h)}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-fog)]">Price</p>
            <p className="font-medium tabular-nums text-[var(--color-lilac-white)]">{formatUsd(market?.priceUsd)}</p>
          </div>
          <div>
            <p className="text-[var(--color-fog)]">Liq.</p>
            <p className="font-medium tabular-nums text-[var(--color-lilac-white)]">{formatUsd(market?.liquidityUsd)}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[5px] border border-[rgba(145,142,160,0.1)] bg-[rgba(3,0,20,0.35)] p-2.5 text-[11px]">
          <p className="font-medium text-[var(--color-lilac-white)]">
            {project.tokenAddress ? "No price data" : "No token price"}
          </p>
          <p className="mt-1 leading-[1.4] text-[var(--color-fog)]">
            {project.tokenAddress
              ? "No active price feed for this token on Base yet."
              : "App listing — links only, no chart."}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[rgba(145,142,160,0.1)] pt-2.5">
        <a
          href={project.website}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-[var(--color-lavender-accent)] underline decoration-[rgba(147,130,255,0.35)] underline-offset-2 hover:text-[var(--color-lilac-white)]"
        >
          Website
        </a>
        {project.tokenAddress || project.baseScanUrl ? (
          <a
            href={project.tokenAddress ? `https://basescan.org/token/${project.tokenAddress}` : project.baseScanUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-[var(--color-lavender-accent)] underline decoration-[rgba(147,130,255,0.35)] underline-offset-2 hover:text-[var(--color-lilac-white)]"
          >
            BaseScan
          </a>
        ) : null}
        {project.x ? (
          <a
            href={project.x}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-[var(--color-lavender-accent)] underline decoration-[rgba(147,130,255,0.35)] underline-offset-2 hover:text-[var(--color-lilac-white)]"
          >
            X
          </a>
        ) : null}
        {market?.pairUrl ? (
          <a
            href={market.pairUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-[var(--color-lavender-accent)] underline decoration-[rgba(147,130,255,0.35)] underline-offset-2 hover:text-[var(--color-lilac-white)]"
          >
            Chart
          </a>
        ) : null}
      </div>
    </article>
  );
}
