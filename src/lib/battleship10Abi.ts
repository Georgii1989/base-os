export const BATTLESHIP10_ABI = [
  {
    type: "function",
    name: "createGame",
    stateMutability: "payable",
    inputs: [],
    outputs: [{ name: "gameId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinGame",
    stateMutability: "payable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "placeShips",
    stateMutability: "nonpayable",
    inputs: [
      { name: "gameId", type: "uint256" },
      {
        name: "ships",
        type: "tuple[5]",
        components: [
          { name: "row", type: "uint8" },
          { name: "col", type: "uint8" },
          { name: "length", type: "uint8" },
          { name: "horizontal", type: "bool" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fire",
    stateMutability: "nonpayable",
    inputs: [
      { name: "gameId", type: "uint256" },
      { name: "row", type: "uint8" },
      { name: "col", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelOpenGame",
    stateMutability: "nonpayable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimMoveTimeout",
    stateMutability: "nonpayable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "closeCasualIdleGame",
    stateMutability: "nonpayable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "CASUAL_INACTIVITY_TIMEOUT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getGame",
    stateMutability: "view",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "playerX", type: "address" },
          { name: "playerO", type: "address" },
          { name: "stakeWei", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "winner", type: "address" },
          { name: "turn", type: "uint8" },
          { name: "shipsX", type: "uint128" },
          { name: "shipsO", type: "uint128" },
          { name: "shotsX", type: "uint128" },
          { name: "shotsO", type: "uint128" },
          { name: "hitsX", type: "uint128" },
          { name: "hitsO", type: "uint128" },
          { name: "placedX", type: "bool" },
          { name: "placedO", type: "bool" },
          { name: "lastMoveAt", type: "uint40" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "nextGameId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_STAKE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_STAKE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "GameCreated",
    inputs: [
      { indexed: true, name: "gameId", type: "uint256" },
      { indexed: true, name: "playerX", type: "address" },
      { name: "stakeWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "GameJoined",
    inputs: [
      { indexed: true, name: "gameId", type: "uint256" },
      { indexed: true, name: "playerO", type: "address" },
    ],
  },
  {
    type: "event",
    name: "ShotFired",
    inputs: [
      { indexed: true, name: "gameId", type: "uint256" },
      { indexed: true, name: "shooter", type: "address" },
      { name: "row", type: "uint8" },
      { name: "col", type: "uint8" },
      { name: "hit", type: "bool" },
    ],
  },
] as const;

export function resolveBattleship10Address(): `0x${string}` | undefined {
  const raw = process.env.NEXT_PUBLIC_BATTLESHIP10_ADDRESS?.trim();
  if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) return raw as `0x${string}`;
  return undefined;
}
