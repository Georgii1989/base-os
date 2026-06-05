"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { resolveAddressToBasename } from "@/lib/baseBasenames";

export function useBasename(address: Address | undefined) {
  return useQuery({
    queryKey: ["basename", address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;
      return resolveAddressToBasename(address);
    },
    enabled: Boolean(address),
    staleTime: 300_000,
    retry: 1,
  });
}
