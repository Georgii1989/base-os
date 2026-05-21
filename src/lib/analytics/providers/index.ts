import type { AnalyticsSourceId } from "@/lib/analyticsSources";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";
import { fetchBlockscoutAnalytics } from "@/lib/analytics/providers/blockscout";
import { fetchDefillamaAnalytics } from "@/lib/analytics/providers/defillama";
import { fetchL2BeatAnalytics } from "@/lib/analytics/providers/l2beat";

export async function fetchAnalyticsBySource(source: AnalyticsSourceId): Promise<BaseAnalyticsPayload> {
  switch (source) {
    case "l2beat":
      return fetchL2BeatAnalytics();
    case "blockscout":
      return fetchBlockscoutAnalytics();
    case "defillama":
    default:
      return fetchDefillamaAnalytics();
  }
}
