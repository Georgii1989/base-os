"use client";

import Link from "next/link";
import { useMemo } from "react";
import { isAddress } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

const OSSUPPORTER_ABI = [
  {
    type: "function",
    name: "hasMinted",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "linkedSoulboundCollection",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
] as const;

export function OSSupporterMintCard({
  isOnBase,
}: {
  isOnBase: boolean;
}) {
  const { address, isConnected } = useAccount();
  const nftRaw = process.env.NEXT_PUBLIC_OS_SUPPORTER_NFT_ADDRESS?.trim();
  const nftAddress =
    nftRaw && isAddress(nftRaw) ? (nftRaw as `0x${string}`) : undefined;

  const { data: hasMinted } = useReadContract({
    address: nftAddress,
    abi: OSSUPPORTER_ABI,
    functionName: "hasMinted",
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(nftAddress && address && isConnected),
    },
  });

  const { data: linkedOnChain } = useReadContract({
    address: nftAddress,
    abi: OSSUPPORTER_ABI,
    functionName: "linkedSoulboundCollection",
    chainId: base.id,
    query: {
      enabled: Boolean(nftAddress),
    },
  });

  const {
    data: mintHash,
    isPending: isMinting,
    writeContract,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();

  const { isLoading: mintConfirming, isSuccess: mintConfirmed } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const linkedDisplay = useMemo(() => {
    const envSbt = process.env.NEXT_PUBLIC_SBT_ADDRESS?.trim();
    const zero = `0x${"0".repeat(40)}`;
    const raw =
      linkedOnChain &&
      typeof linkedOnChain === "string" &&
      linkedOnChain.toLowerCase() !== zero.toLowerCase()
        ? linkedOnChain
        : envSbt && isAddress(envSbt)
          ? envSbt
          : null;
    return raw;
  }, [linkedOnChain]);

  if (!nftAddress) {
    return (
      <div className="mt-4 grid gap-3 rounded-2xl border border-indigo-300/25 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-indigo-200">Base OS supporter NFT</h2>
        <p className="text-sm text-indigo-100/85">
          Deploy <span className="font-mono text-indigo-50">BaseOSSupporterNFT</span> on Base and set{" "}
          <span className="font-mono text-indigo-50">NEXT_PUBLIC_OS_SUPPORTER_NFT_ADDRESS</span> to enable minting here.
        </p>
      </div>
    );
  }

  const mintDone = Boolean(hasMinted) || mintConfirmed;

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-indigo-300/25 bg-slate-950/50 p-4">
      <h2 className="text-xl font-black text-indigo-200">Base OS supporter NFT</h2>
      <p className="text-sm text-indigo-100/85">
        Soulbound badge minted from this app (gas only). Token metadata links to the tip-profile soulbound collection on
        BaseScan — send a tip through Base OS to mint that badge too.
      </p>
      {linkedDisplay ? (
        <Link
          href={`https://basescan.org/token/${linkedDisplay}`}
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded-lg border border-indigo-300/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-100"
        >
          Tip soulbound collection ↗
        </Link>
      ) : (
        <p className="text-xs text-indigo-200/70">
          Set <span className="font-mono">NEXT_PUBLIC_SBT_ADDRESS</span> so metadata and links resolve cleanly.
        </p>
      )}
      {!isConnected ? (
        <p className="text-sm text-indigo-200/80">Connect a wallet to mint.</p>
      ) : !isOnBase ? (
        <p className="text-sm text-amber-200">Switch to Base to mint.</p>
      ) : mintDone ? (
        <div className="rounded-xl border border-indigo-200/40 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-50">
          Minted — soulbound on your wallet.
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`https://basescan.org/address/${nftAddress}?a=${address}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-cyan-300 underline"
            >
              View on BaseScan ↗
            </Link>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={isMinting || mintConfirming}
            onClick={() => {
              resetMint();
              writeContract({
                address: nftAddress,
                abi: OSSUPPORTER_ABI,
                functionName: "mint",
              });
            }}
            className="w-fit rounded-xl bg-indigo-500/85 px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMinting || mintConfirming ? "Confirm in wallet…" : "Mint Base OS supporter"}
          </button>
          {mintHash ? (
            <p className="text-xs text-indigo-200/90">
              Tx:{" "}
              <a
                href={`https://basescan.org/tx/${mintHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-bold text-cyan-300 underline"
              >
                {mintHash.slice(0, 10)}…
              </a>
              {mintConfirmed ? " · confirmed" : " · confirming"}
            </p>
          ) : null}
          {mintError ? (
            <p className="text-sm text-rose-300">
              {"shortMessage" in mintError && typeof mintError.shortMessage === "string"
                ? mintError.shortMessage
                : mintError.message}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
