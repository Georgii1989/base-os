import { createFacilitatorConfig, facilitator as defaultFacilitator } from "@coinbase/x402";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { BUILDER_CODE, declareBuilderCodeExtension } from "@x402/extensions/builder-code";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import type { RouteConfig } from "@x402/next";
import {
  isX402SellerConfigured,
  resolveX402BuilderCode,
  resolveX402PayTo,
  resolveX402ScorePrice,
  X402_BASE_MAINNET,
} from "@/lib/x402/config";

let resourceServer: x402ResourceServer | null = null;

function resolveFacilitatorConfig() {
  const id = process.env.CDP_API_KEY_ID?.trim();
  const secret = process.env.CDP_API_KEY_SECRET?.trim();
  if (id && secret) return createFacilitatorConfig(id, secret);
  return defaultFacilitator;
}

export function getX402ResourceServer(): x402ResourceServer | null {
  if (!isX402SellerConfigured()) return null;
  if (!resourceServer) {
    const facilitatorClient = new HTTPFacilitatorClient(resolveFacilitatorConfig());
    resourceServer = new x402ResourceServer(facilitatorClient).register(
      X402_BASE_MAINNET,
      new ExactEvmScheme()
    );
  }
  return resourceServer;
}

export function buildX402ScoreRouteConfig(): RouteConfig | null {
  const payTo = resolveX402PayTo();
  const builderCode = resolveX402BuilderCode();
  if (!payTo || !builderCode) return null;

  return {
    accepts: [
      {
        scheme: "exact",
        price: resolveX402ScorePrice(),
        network: X402_BASE_MAINNET,
        payTo,
      },
    ],
    description:
      "Base OS onchain score — heuristic activity grade for any Base mainnet address (agents + wallets).",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
        input: {
          type: "http",
          method: "GET",
          queryParams: {
            address: {
              type: "string",
              description: "Checksummed or lowercase 0x address on Base",
              required: true,
            },
          },
        },
        output: {
          example: {
            address: "0x8655520b4b19187038aC9a4f560da0979Cc1E95C",
            score: { score: 85, grade: "B" },
            source: "blockscout",
          },
        },
      }),
      [BUILDER_CODE]: declareBuilderCodeExtension(builderCode),
    },
  };
}
