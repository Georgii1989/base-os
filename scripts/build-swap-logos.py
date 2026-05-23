import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
cg = json.loads((ROOT / "scripts/cg-base-tokens.json").read_text(encoding="utf-8"))
swap_ts = (ROOT / "src/lib/swapBaseTokens.ts").read_text(encoding="utf-8")

by_addr = {t["address"].lower(): t.get("logoURI") for t in cg["tokens"]}
eth_logo = "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png"
native = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

entries: list[str] = []
for match in re.finditer(r'symbol: "([^"]+)".*?address: "(0x[a-fA-F0-9]+)"', swap_ts, re.S):
    symbol, addr = match.group(1), match.group(2).lower()
    logo = eth_logo if addr == native else by_addr.get(addr)
    if logo:
        entries.append(f'  "{addr}": "{logo}",  // {symbol}')
    else:
        entries.append(f'  // {symbol} {addr} — no logo')

out = ROOT / "src/lib/swapTokenLogos.ts"
out.write_text(
    "\n".join(
        [
            "/** Token logos keyed by lowercase contract address on Base. */",
            "export const SWAP_TOKEN_LOGOS: Record<string, string> = {",
            *entries,
            "};",
            "",
            "export function swapTokenLogo(address: string): string | undefined {",
            "  return SWAP_TOKEN_LOGOS[address.toLowerCase()];",
            "}",
            "",
        ]
    ),
    encoding="utf-8",
)
print(f"Wrote {out} ({sum(1 for e in entries if e.startswith('  \"'))} logos)")
