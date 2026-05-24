import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://app-base-os.vercel.app";
  const tabs = ["home", "swap", "launch", "tip", "score", "guard", "watch", "analytics", "radar"];
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...tabs.map((tab) => ({
      url: `${base}/?tab=${tab}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: tab === "home" ? 0.9 : 0.7,
    })),
    { url: `${base}/safety`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
