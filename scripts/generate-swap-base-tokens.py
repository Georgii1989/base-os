import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
cmc = json.loads((ROOT / "cmc-top30.json").read_text(encoding="utf-8"))
cg = json.loads((ROOT / "cg-base-tokens.json").read_text(encoding="utf-8"))

syms = {t["symbol"].upper(): t for t in cg["tokens"]}
cmc_list = cmc["data"]["cryptoCurrencyList"]

NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


def slugify(symbol: str, name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not base:
        base = symbol.lower()
    return base[:48]


def checksum(addr: str) -> str:
    return addr  # keep as resolved; viem accepts any case


entries = [
    {
        "id": "eth",
        "symbol": "ETH",
        "name": "ETH",
        "address": NATIVE,
        "decimals": 18,
        "cmcRank": 0,
    }
]

for c in cmc_list:
    sym = c["symbol"].upper()
    plat = c.get("platform") or {}
    cmc_base = plat.get("token_address") if plat.get("slug") == "base" else None
    cg_t = syms.get(sym)
    if not cmc_base and not cg_t:
        raise SystemExit(f"Missing Base address for {sym}")

    addr = cmc_base or cg_t["address"]
    decimals = int(cg_t["decimals"]) if cg_t else 18
    token_id = slugify(sym, c.get("slug") or sym)
    # ensure unique ids
    existing_ids = {e["id"] for e in entries}
    if token_id in existing_ids:
        token_id = f"{token_id}-{sym.lower()}"

    entries.append(
        {
            "id": token_id,
            "symbol": sym,
            "name": sym,
            "address": checksum(addr),
            "decimals": decimals,
            "cmcRank": c.get("cmcRank"),
        }
    )

lines = [
    'const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;',
    "",
    "export type SwapTokenPreset = {",
    "  id: string;",
    "  symbol: string;",
    "  name: string;",
    "  address: `0x${string}`;",
    "  decimals: number;",
    "  /** CoinMarketCap rank within Base Ecosystem category */",
    "  cmcRank?: number;",
    "};",
    "",
    "/** Native ETH + CoinMarketCap Base Ecosystem top 30 by market cap. */",
    "export const BASE_TOP_SWAP_TOKENS: SwapTokenPreset[] = [",
]

for e in entries:
    lines.append("  {")
    lines.append(f'    id: "{e["id"]}",')
    lines.append(f'    symbol: "{e["symbol"]}",')
    lines.append(f'    name: "{e["name"]}",')
    lines.append(f'    address: "{e["address"]}",')
    lines.append(f'    decimals: {e["decimals"]},')
    if e.get("cmcRank") is not None:
        lines.append(f'    cmcRank: {e["cmcRank"]},')
    lines.append("  },")

lines.extend(
    [
        "];",
        "",
        "export const SWAP_TOKEN_PRESETS = BASE_TOP_SWAP_TOKENS;",
        "",
    ]
)

out = ROOT.parent / "src" / "lib" / "swapBaseTokens.ts"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {len(entries)} tokens to {out}")
