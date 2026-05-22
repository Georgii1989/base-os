/** True when the app runs inside the Base App mini-app shell (not a normal desktop browser tab). */
export function isBaseAppEmbed(): boolean {
  if (typeof window === "undefined") return false;

  const eth = (window as Window & { ethereum?: { isBase?: boolean; isCoinbaseBrowser?: boolean } })
    .ethereum;
  if (eth?.isBase === true || eth?.isCoinbaseBrowser === true) return true;

  try {
    if (window.self !== window.top) {
      const ref = document.referrer.toLowerCase();
      if (
        ref.includes("base.org") ||
        ref.includes("base.app") ||
        ref.includes("coinbase.com") ||
        ref.includes("wallet.coinbase.com")
      ) {
        return true;
      }
    }
  } catch {
    // Cross-origin iframe — typical for embedded mini apps
    return true;
  }

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("baseapp") || ua.includes("base/")) return true;

  return false;
}
