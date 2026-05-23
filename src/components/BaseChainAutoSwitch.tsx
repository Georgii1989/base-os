"use client";

import { useSearchParams } from "next/navigation";
import { useAutoSwitchToBase } from "@/hooks/useAutoSwitchToBase";
import { tabFromSearchParam } from "@/lib/osTabs";

/** Runs once app-wide after wallet connect — switches Ethereum → Base when needed. */
export function BaseChainAutoSwitch() {
  const searchParams = useSearchParams();
  const tab = tabFromSearchParam(searchParams.get("tab"));
  useAutoSwitchToBase({ enabled: tab !== "swap" });
  return null;
}
