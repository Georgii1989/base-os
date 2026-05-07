export type RadarProject = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  categories: string[];
  stage: "New" | "Growing" | "Mature";
  risk: "Low" | "Medium" | "High";
  tokenAddress: `0x${string}`;
  website: string;
  x: string;
  accent: string;
};

export const radarProjects: RadarProject[] = [
  {
    id: "aerodrome",
    name: "Aerodrome",
    symbol: "AERO",
    description: "Base-native liquidity hub and AMM with vote-escrow incentives.",
    categories: ["DeFi", "DEX", "Liquidity"],
    stage: "Mature",
    risk: "Low",
    tokenAddress: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    website: "https://aerodrome.finance",
    x: "https://x.com/AerodromeFi",
    accent: "from-blue-500 to-cyan-300",
  },
  {
    id: "virtuals",
    name: "Virtuals Protocol",
    symbol: "VIRTUAL",
    description: "AI agent launch and ownership economy built around onchain agents.",
    categories: ["AI", "Social", "Infra"],
    stage: "Growing",
    risk: "Medium",
    tokenAddress: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
    website: "https://www.virtuals.io",
    x: "https://x.com/virtuals_io",
    accent: "from-violet-500 to-fuchsia-300",
  },
  {
    id: "moonwell",
    name: "Moonwell",
    symbol: "WELL",
    description: "Lending and borrowing market for Base and the wider onchain economy.",
    categories: ["DeFi", "Lending", "Yield"],
    stage: "Mature",
    risk: "Low",
    tokenAddress: "0xA88594D404727625A9437C3f886C7643872296AE",
    website: "https://moonwell.fi",
    x: "https://x.com/MoonwellDeFi",
    accent: "from-emerald-500 to-cyan-300",
  },
  {
    id: "degen",
    name: "Degen",
    symbol: "DEGEN",
    description: "Farcaster-native community token and reward economy on Base.",
    categories: ["Social", "Community", "Rewards"],
    stage: "Mature",
    risk: "Medium",
    tokenAddress: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
    website: "https://www.degen.tips",
    x: "https://x.com/degentokenbase",
    accent: "from-pink-500 to-amber-300",
  },
  {
    id: "brett",
    name: "Brett",
    symbol: "BRETT",
    description: "One of the largest Base meme communities and culture tokens.",
    categories: ["Meme", "Community", "Social"],
    stage: "Mature",
    risk: "Medium",
    tokenAddress: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
    website: "https://www.basedbrett.com",
    x: "https://x.com/BasedBrett",
    accent: "from-indigo-500 to-blue-300",
  },
  {
    id: "clanker",
    name: "Clanker",
    symbol: "CLANKER",
    description: "Tokenbot and social launch primitive for creating tokens on Base.",
    categories: ["AI", "Social", "Launchpad"],
    stage: "Growing",
    risk: "Medium",
    tokenAddress: "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
    website: "https://www.clanker.world",
    x: "https://x.com/clankeronbase",
    accent: "from-lime-500 to-emerald-300",
  },
];
