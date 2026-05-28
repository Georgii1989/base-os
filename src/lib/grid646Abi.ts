export const GRID646_ABI = [
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
    name: "play",
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
    name: "getGame",
    stateMutability: "view",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [
      { name: "playerX", type: "address" },
      { name: "playerO", type: "address" },
      { name: "stakeWei", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "winner", type: "address" },
      { name: "turn", type: "uint8" },
      { name: "xMask", type: "uint256" },
      { name: "oMask", type: "uint256" },
      { name: "lastMoveAt", type: "uint40" },
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
] as const;

export function resolveGrid646Address(): `0x${string}` | undefined {
  const raw = process.env.NEXT_PUBLIC_GRID646_ADDRESS?.trim();
  if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) return raw as `0x${string}`;
  return undefined;
}
