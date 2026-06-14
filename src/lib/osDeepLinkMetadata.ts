import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { fetchOnchainScore } from "@/lib/onchainScoreFetch";
import { tabFromSearchParam } from "@/lib/osTabs";
import { buildOsTabUrl, parseAddressSearchParam } from "@/lib/osUrlParams";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://app-base-os.vercel.app";

const DEFAULT_METADATA: Metadata = {
  title: "Base OS · your onchain command center",
  description:
    "Personal briefing, swap & bridge, tips, score, guard, analytics, and radar — one system for Base.",
  openGraph: {
    title: "Base OS · your onchain command center",
    description:
      "Personal briefing, swap & bridge, tips, score, guard, analytics, and radar — one system for Base.",
    type: "website",
    url: APP_ORIGIN,
  },
  twitter: {
    card: "summary_large_image",
    title: "Base OS · your onchain command center",
    description:
      "Personal briefing, swap & bridge, tips, score, guard, analytics, and radar — one system for Base.",
  },
};

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Dynamic OG/title for `/?tab=…&address=…` share links. */
export async function buildOsDeepLinkMetadata(
  tabRaw: string | null | undefined,
  addressRaw: string | null | undefined
): Promise<Metadata> {
  const tab = tabFromSearchParam(tabRaw ?? null);
  const address = parseAddressSearchParam(addressRaw);
  if (!address) return DEFAULT_METADATA;

  const short = shortAddress(address);
  const tabUrl = buildOsTabUrl(tab, { address, origin: APP_ORIGIN });
  const ogImage = `${APP_ORIGIN}/card/${getAddress(address)}/opengraph-image`;

  if (tab === "score") {
    try {
      const data = await fetchOnchainScore(address);
      if (data) {
        const title = `Onchain score · ${short} · Grade ${data.score.grade}`;
        const description = `Score ${data.score.score}/100 on Base — ${data.score.metrics.deployments} deployments, ${data.score.metrics.activeDays} active days.`;
        return {
          title,
          description,
          openGraph: {
            title,
            description,
            type: "website",
            url: tabUrl,
            images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImage],
          },
        };
      }
    } catch {
      // fall through to generic score metadata
    }
    const title = `Onchain score · ${short}`;
    const description = `Analyze Base activity for ${address}.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website", url: tabUrl, images: [{ url: ogImage, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    };
  }

  if (tab === "portfolio") {
    const title = `Base portfolio · ${short}`;
    const description = `ETH and ERC-20 balances on Base for ${address}.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website", url: tabUrl },
      twitter: { card: "summary", title, description },
    };
  }

  if (tab === "guard") {
    const title = `Token guard · ${short}`;
    const description = `Review and revoke ERC-20 approvals on Base for ${address}.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website", url: tabUrl },
      twitter: { card: "summary", title, description },
    };
  }

  return DEFAULT_METADATA;
}

export function normalizeDeepLinkAddressInput(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (isAddress(trimmed)) {
    try {
      return getAddress(trimmed);
    } catch {
      return null;
    }
  }
  return trimmed;
}
