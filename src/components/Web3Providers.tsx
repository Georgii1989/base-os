"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { WagmiProvider } from "wagmi";
import { BaseChainAutoSwitch } from "@/components/BaseChainAutoSwitch";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { wagmiConfig } from "@/lib/wagmiConfig";

export function Web3Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <BaseChainAutoSwitch />
        </Suspense>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
