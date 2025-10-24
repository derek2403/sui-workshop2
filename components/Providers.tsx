'use client';

/**
 * Providers Component
 * 
 * Sets up the necessary providers for:
 * - React Query (for data fetching)
 * - Sui dApp Kit (for wallet connections)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useState } from 'react';
import '@mysten/dapp-kit/dist/index.css';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create a React Query client with default options
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Get the network from environment
  const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

  // Configure Sui network using createNetworkConfig
  const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={network}>
        <WalletProvider autoConnect={false}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

