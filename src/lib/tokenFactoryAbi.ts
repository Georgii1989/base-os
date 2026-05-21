export const TOKEN_FACTORY_ABI = [
  {
    type: "function",
    name: "launch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "initialSupply", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  {
    type: "event",
    name: "TokenLaunched",
    anonymous: false,
    inputs: [
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "token", type: "address", indexed: true, internalType: "address" },
      { name: "name", type: "string", indexed: false, internalType: "string" },
      { name: "symbol", type: "string", indexed: false, internalType: "string" },
      { name: "initialSupply", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

export const TOKEN_LAUNCHED_EVENT = {
  type: "event",
  name: "TokenLaunched",
  inputs: [
    { name: "creator", type: "address", indexed: true },
    { name: "token", type: "address", indexed: true },
    { name: "name", type: "string", indexed: false },
    { name: "symbol", type: "string", indexed: false },
    { name: "initialSupply", type: "uint256", indexed: false },
  ],
} as const;
