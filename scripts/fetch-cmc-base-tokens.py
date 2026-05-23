import json
import time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}


def get(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


# CMC top 30 base-ecosystem by market cap
cmc = get(
    "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing"
    "?start=1&limit=30&sortBy=market_cap&sortType=desc&convert=USD"
    "&cryptoType=all&tagType=all&audited=false&tagSlugs=base-ecosystem"
)
cmc_coins = cmc["data"]["cryptoCurrencyList"]

# CoinGecko coin list for id/symbol lookup
cg_list = get("https://api.coingecko.com/api/v3/coins/list")
by_symbol: dict[str, list[str]] = {}
for c in cg_list:
    by_symbol.setdefault(c["symbol"].upper(), []).append(c["id"])

# Manual slug overrides where symbol is ambiguous
SLUG_MAP = {
    "polkadot-new": "polkadot",
    "shiba-inu": "shiba-inu",
    "curve-dao-token": "curve-dao-token",
    "layerzero": "layerzero",
    "pancakeswap-token": "pancakeswap-token",
    "aerodrome-finance": "aerodrome-finance",
    "virtual-protocol": "virtual-protocol",
    "morpho": "morpho",
    "venice-token": "venice-token",
    "bonk": "bonk",
    "chainlink": "chainlink",
    "the-sandbox": "the-sandbox",
    "reserve-rights-token": "reserve-rights",
    "cow-protocol": "cow-protocol",
    "horizen": "horizen",
    "beldex": "beldex",
    "kaito": "kaito",
    "spx6900": "spx6900",
    "maple-finance": "maple-finance",
    "origintrail": "origintrail",
    "fluid": "fluid-2",
    "beam-2": "beam-2",
    "sosovalue": "sosovalue",
    "ribbita-by-virtuals": "ribbita-by-virtuals",
    "awe-network": "awe-network",
    "ravedao": "ravedao",
    "river": "river",
    "bobo-coin": "bobo-coin",
}


def resolve_cg_id(cmc_coin):
    slug = cmc_coin.get("slug", "")
    if slug in SLUG_MAP:
        return SLUG_MAP[slug]
    sym = cmc_coin["symbol"].upper()
    ids = by_symbol.get(sym, [])
    if slug.replace("-", "") in [i.replace("-", "") for i in ids]:
        for i in ids:
            if slug in i or i in slug:
                return i
    if len(ids) == 1:
        return ids[0]
    for i in ids:
        if i == slug:
            return i
    return ids[0] if ids else None


out = []
for c in cmc_coins:
    sym = c["symbol"]
    cg_id = resolve_cg_id(c)
    row = {
        "rank": len(out) + 1,
        "symbol": sym,
        "name": c.get("name"),
        "slug": c.get("slug"),
        "cg_id": cg_id,
        "base": None,
        "decimals": None,
    }
    if cg_id:
        try:
            detail = get(
                f"https://api.coingecko.com/api/v3/coins/{cg_id}"
                "?localization=false&tickers=false&market_data=false"
                "&community_data=false&developer_data=false&sparkline=false"
            )
            time.sleep(0.35)
            row["base"] = detail.get("platforms", {}).get("base")
            row["decimals"] = detail.get("detail_platforms", {}).get("base", {}).get("decimal_place")
        except Exception as e:
            row["error"] = str(e)
    out.append(row)

print(json.dumps(out, indent=2))
print("\nwith base:", sum(1 for x in out if x.get("base")), "/ 30")
