import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

type Props = { params: Promise<{ tokenId: string }> };

/** ERC-721 metadata for Base OSSupporterNFT — links to tip soulbound collection on BaseScan. */
export async function GET(_request: Request, context: Props) {
  const { tokenId } = await context.params;
  if (!/^\d+$/.test(tokenId) || BigInt(tokenId) <= BigInt(0)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const appUrlRaw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app-base-os.vercel.app";
  const appUrl = appUrlRaw.replace(/\/$/, "");

  const sbtRaw = process.env.NEXT_PUBLIC_SBT_ADDRESS?.trim();
  let externalUrl = appUrl;
  let linkedTrait = "Configure NEXT_PUBLIC_SBT_ADDRESS";

  if (sbtRaw && isAddress(sbtRaw)) {
    const checksum = getAddress(sbtRaw);
    externalUrl = `https://basescan.org/token/${checksum}`;
    linkedTrait = checksum;
  }

  const body = {
    name: `Base OS Supporter #${tokenId}`,
    description:
      "Soulbound supporter badge minted from Base OS. See the linked soulbound tip-profile collection on BaseScan — sending an on-chain tip through Base OS mints that badge.",
    image: `${appUrl}/ossupporter-badge.svg`,
    external_url: externalUrl,
    attributes: [
      { trait_type: "App", value: "Base OS" },
      { trait_type: "Linked soulbound (tip badge)", value: linkedTrait },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
