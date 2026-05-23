import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
cmc = json.loads((ROOT / "cmc-top30.json").read_text(encoding="utf-8"))
cg = json.loads((ROOT / "cg-base-tokens.json").read_text(encoding="utf-8"))

syms = {t["symbol"].upper(): t for t in cg["tokens"]}
cmc_list = cmc["data"]["cryptoCurrencyList"]

# Manual overrides when CoinGecko list misses or CMC platform is Base
OVERRIDES = {
    "ETH": {"address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "decimals": 18},
    "LINK": {"address": "0x88Fb2A2C7899AB46557fB1665FaF7ae75B2e4a4", "decimals": 18},
    "DOT": {"address": "0x8d010bf9c26881788b4e6bf5fd1bdc358c8f90b8", "decimals": 18},
    "MORPHO": {"address": "0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842", "decimals": 18},
    "VVV": {"address": "0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf", "decimals": 18},
    "VIRTUAL": {"address": "0x0b3e328455c4059eeb9f3f84b5543f74e24e7e1b", "decimals": 18},
    "CAKE": {"address": "0x3055913c90Fcc1a6CE9a358911721eEB942013a1", "decimals": 18},
    "ZRO": {"address": "0x6985884C4392D348587B19cb9eAAf157F13271cd", "decimals": 18},
    "AERO": {"address": "0x940181a94a35a4569e4529a3cdfb74e38fd98631", "decimals": 18},
    "CRV": {"address": "0x8Ee73c484A26e0A5df2Ee2a4961341E6F331e61", "decimals": 18},
    "SPX": {"address": "0x50da645F148798F68eFeC8738e2e6579F314AEB7", "decimals": 18},
    "SYRUP": {"address": "0x643C4E15d7d62Ad0aBeC4a9BD4b001aA3Ef52d66", "decimals": 18},
    "TRAC": {"address": "0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f", "decimals": 18},
    "SAND": {"address": "0x3845badAde8e6dFF049820680d1F14bD3903a5d0", "decimals": 18},
    "KAITO": {"address": "0x98d0baa52b2D063E780DE12F615f963Fe8537553", "decimals": 18},
    "RSR": {"address": "0x320623b8e4ff03373931769a31fc52a4e78b5d70", "decimals": 18},
    "SOSO": {"address": "0x76A0e27618462bDAC7a29104bdcfFf4E6BFCea2D", "decimals": 18},
    "TIBBIR": {"address": "0xa4a2e2ca3fbfe21aed83471d28b6f65a233c6e00", "decimals": 18},
    "COW": {"address": "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB", "decimals": 18},
    "BEAM": {"address": "0x62D0A8458eD7719FDAF978fe5929C6D342B0bFcE", "decimals": 18},
    "AWE": {"address": "0x1B4617734C43F6159F3a70b7E06d883647512778", "decimals": 18},
    "BONK": {"address": "0x2a85B05089Bc3D8bB4FAa31b9dD4a6D8d8885AE8", "decimals": 5},  # verify
    "SHIB": {"address": "0xfe30df3f8a651758314ed1166f70560a18747749", "decimals": 18},  # verify
    "FLUID": {"address": "0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb", "decimals": 18},
    "RIVER": {"address": "0xdA7AD9dea9397cffdDAE2F8a052B82f1484252B3", "decimals": 18},
    "BOBO": {"address": "0xb90b2a35c65dbc466b04240097ca756ad2005295", "decimals": 18},
    "RAVE": {"address": "0x17205fab260a7a6383a81452cE6315A39370Db97", "decimals": 18},
    "ZEN": {"address": "0xF1Dfc209F2231858F106327E1346685e055aF802", "decimals": 18},  # verify
    "BDX": {"address": "0x8a16D4bF8A0a716017e8D2262c4aC32927797a2F", "decimals": 18},  # might be wrong - VCNT polygon
    "VCNT": {"address": "0x8a16D4bF8A0a716017e8D2262c4aC32927797a2F", "decimals": 18},
    "CHIP": {"address": "0x0C1c1C109FE34733fca54b82d7B46B75CFb71F6e", "decimals": 18},  # arbitrum primary
}

print("CMC top 30 -> Base address resolution:\n")
for i, c in enumerate(cmc_list, 1):
    sym = c["symbol"].upper()
    plat = c.get("platform") or {}
    cmc_base = plat.get("token_address") if plat.get("slug") == "base" else None
    cg = syms.get(sym)
    ov = OVERRIDES.get(sym)
    addr = cmc_base or (cg["address"] if cg else None) or (ov["address"] if ov else None)
    dec = (cg["decimals"] if cg else None) or (ov["decimals"] if ov else None)
    src = "cmc-base" if cmc_base else "coingecko" if cg else "override" if ov else "MISSING"
    print(f"{i:2} {sym:8} {addr or 'MISSING':42} dec={dec} ({src})")
