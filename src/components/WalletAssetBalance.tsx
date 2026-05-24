"use client";

type Props = {
  chainLabel: string;
  assetLabel: string;
  balanceLabel: string | null;
  isConnected: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onMax?: () => void;
  maxDisabled?: boolean;
};

export function WalletAssetBalance({
  chainLabel,
  assetLabel,
  balanceLabel,
  isConnected,
  isLoading,
  isError,
  onMax,
  maxDisabled,
}: Props) {
  if (!isConnected) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-black/25 px-3 py-2.5 text-center text-xs text-slate-500">
        Connect wallet to see your {assetLabel} balance
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Balance on {chainLabel}
          </span>
          <span className="h-4 w-24 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
        Could not load {assetLabel} balance on {chainLabel}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/12 to-violet-500/8 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
          Your balance · {chainLabel}
        </p>
        <p className="mt-0.5 truncate text-base font-black tabular-nums text-cyan-100">
          {balanceLabel ?? `0 ${assetLabel}`}
        </p>
      </div>
      {onMax ? (
        <button
          type="button"
          onClick={onMax}
          disabled={maxDisabled}
          className="shrink-0 rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-40"
        >
          Max
        </button>
      ) : null}
    </div>
  );
}
