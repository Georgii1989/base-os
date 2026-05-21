"use client";

import { useAutoSwitchToBase } from "@/hooks/useAutoSwitchToBase";

/** Runs once app-wide after wallet connect — switches Ethereum → Base when needed. */
export function BaseChainAutoSwitch() {
  useAutoSwitchToBase();
  return null;
}
