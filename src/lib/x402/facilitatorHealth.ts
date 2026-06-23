import { getX402ResourceServer, buildX402ScoreRouteConfig } from "@/lib/x402/server";
import { x402HTTPResourceServer } from "@x402/core/server";
import { isX402SellerConfigured } from "@/lib/x402/config";

export async function probeX402Facilitator(): Promise<{ ok: boolean; error?: string }> {
  if (!isX402SellerConfigured()) return { ok: false, error: "not_configured" };

  const server = getX402ResourceServer();
  const routeConfig = buildX402ScoreRouteConfig();
  if (!server || !routeConfig) return { ok: false, error: "not_configured" };

  try {
    const httpServer = new x402HTTPResourceServer(server, { "*": routeConfig });
    await httpServer.initialize();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "init_failed";
    return { ok: false, error: message };
  }
}
