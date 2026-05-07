/** First 4 bytes → human hint (best-effort, not exhaustive). */
export const TX_SELECTOR_HINTS: Record<string, string> = {
  a9059cbb: "ERC-20 · transfer(recipient, amount)",
  "095ea7b3": "ERC-20 · approve(spender, amount)",
  "23b872dd": "transferFrom(from, to, amount) — ERC-20 or ERC-721",
  dd62ed3e: "ERC-20 · allowance(owner, spender)",
  "70a08231": "ERC-20 · balanceOf(account)",
  "18160ddd": "ERC-20 · totalSupply()",
  d0e30db0: "WETH-like · deposit()",
  "2e1a7d4d": "WETH-like · withdraw(uint256 amount)",
  "38ed1739": "DEX · swapExactTokensForTokens(amountIn, …)",
  "7ff36ab5": "DEX · swapExactETHForTokens(…)",
  "18cbafe5": "DEX · swapExactTokensForETH(…)",
  e8e33700: "DEX · addLiquidity(…)",
  baa2abde: "DEX · removeLiquidity(…)",
  b6b55f25: "Delegate / permit pattern — verify target",
  "42842e0e": "ERC-721 · safeTransferFrom(…)",
  "252dba42": "Multicall / aggregate pattern",
};

export function decodeSelectorHex(dataHex: string): string | null {
  const trimmed = dataHex.trim().toLowerCase().replace(/^0x/, "");
  if (trimmed.length < 8) return null;
  const sel = trimmed.slice(0, 8);
  return TX_SELECTOR_HINTS[sel] ?? `Unknown selector · 0x${sel}`;
}
