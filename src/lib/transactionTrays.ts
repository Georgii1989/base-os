import { encodeFunctionData, parseEther } from "viem";
import { GRID646_ABI, resolveGrid646Address } from "@/lib/grid646Abi";
import { BATTLESHIP10_ABI, resolveBattleship10Address } from "@/lib/battleship10Abi";
import { resolveTipJarAddress } from "@/lib/tipContracts";
import { buildOsTabUrl } from "@/lib/osUrlParams";

const TIP_ABI = [
  {
    type: "function",
    name: "tip",
    stateMutability: "payable",
    inputs: [{ name: "message", type: "string" }],
    outputs: [],
  },
] as const;

export type TransactionTrayAction = {
  id: string;
  label: string;
  description: string;
  chainId: number;
  to: `0x${string}`;
  data: `0x${string}`;
  valueWei: string;
  deepLink?: string;
};

export type TransactionTray = {
  id: string;
  title: string;
  summary: string;
  actions: TransactionTrayAction[];
};

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://app-base-os.vercel.app";

export function buildTransactionTrays(): TransactionTray[] {
  const tipRouter = resolveTipJarAddress();
  const grid646 = resolveGrid646Address();
  const battleship = resolveBattleship10Address();

  const trays: TransactionTray[] = [];

  trays.push({
    id: "tip_support",
    title: "Tip Base OS",
    summary: "Send a small ETH tip through TipWithBadgeRouter on Base.",
    actions: [
      {
        id: "tip_default",
        label: "Tip 0.0005 ETH",
        description: "Support Base OS — may mint soulbound badge on first tip.",
        chainId: 8453,
        to: tipRouter,
        data: encodeFunctionData({
          abi: TIP_ABI,
          functionName: "tip",
          args: ["Support Base OS"],
        }),
        valueWei: parseEther("0.0005").toString(),
        deepLink: buildOsTabUrl("tip", { origin: APP_ORIGIN }),
      },
    ],
  });

  if (grid646) {
    trays.push({
      id: "grid646_casual",
      title: "Grid 6×6 casual room",
      summary: "Create or join a free-stake onchain Grid 6×6 room on Base.",
      actions: [
        {
          id: "grid646_create_casual",
          label: "Create casual room",
          description: "Host as X — 0 ETH stake.",
          chainId: 8453,
          to: grid646,
          data: encodeFunctionData({ abi: GRID646_ABI, functionName: "createGame" }),
          valueWei: "0",
          deepLink: buildOsTabUrl("game", { origin: APP_ORIGIN }),
        },
        {
          id: "grid646_join",
          label: "Join room (template)",
          description: "Pass gameId when rendering tray — example uses room 1.",
          chainId: 8453,
          to: grid646,
          data: encodeFunctionData({
            abi: GRID646_ABI,
            functionName: "joinGame",
            args: [BigInt(1)],
          }),
          valueWei: "0",
          deepLink: buildOsTabUrl("game", { room: "1", origin: APP_ORIGIN }),
        },
      ],
    });
  }

  if (battleship) {
    trays.push({
      id: "battleship_casual",
      title: "Battleship casual room",
      summary: "Create or join a free Battleship 10×10 room on Base.",
      actions: [
        {
          id: "battleship_create_casual",
          label: "Create casual room",
          description: "Host a 0 ETH naval room.",
          chainId: 8453,
          to: battleship,
          data: encodeFunctionData({ abi: BATTLESHIP10_ABI, functionName: "createGame" }),
          valueWei: "0",
          deepLink: buildOsTabUrl("battleship", { origin: APP_ORIGIN }),
        },
        {
          id: "battleship_join",
          label: "Join room (template)",
          description: "Pass gameId when rendering tray — example uses room 1.",
          chainId: 8453,
          to: battleship,
          data: encodeFunctionData({
            abi: BATTLESHIP10_ABI,
            functionName: "joinGame",
            args: [BigInt(1)],
          }),
          valueWei: "0",
          deepLink: buildOsTabUrl("battleship", { room: "1", origin: APP_ORIGIN }),
        },
      ],
    });
  }

  return trays;
}

export function trayForRoom(
  trays: TransactionTray[],
  trayId: "grid646_casual" | "battleship_casual",
  room: string
): TransactionTray | undefined {
  const tray = trays.find((t) => t.id === trayId);
  if (!tray) return undefined;
  const joinId = trayId === "grid646_casual" ? "grid646_join" : "battleship_join";
  const tab = trayId === "grid646_casual" ? "game" : "battleship";
  const abi = trayId === "grid646_casual" ? GRID646_ABI : BATTLESHIP10_ABI;
  const contract = trayId === "grid646_casual" ? resolveGrid646Address() : resolveBattleship10Address();
  if (!contract || !/^\d+$/.test(room)) return tray;

  return {
    ...tray,
    actions: tray.actions.map((action) => {
      if (action.id !== joinId) return action;
      return {
        ...action,
        label: `Join room #${room}`,
        data: encodeFunctionData({
          abi,
          functionName: "joinGame",
          args: [BigInt(room)],
        }),
        deepLink: buildOsTabUrl(tab as "game" | "battleship", { room, origin: APP_ORIGIN }),
      };
    }),
  };
}
