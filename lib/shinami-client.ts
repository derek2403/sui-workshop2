/**
 * Shinami Client Configuration
 * 
 * This file initializes the Shinami clients for Gas Station and Node Service.
 * Make sure to set up your environment variables before using these clients.
 */

import { GasStationClient } from '@shinami/clients/sui';
import { SuiClient } from '@mysten/sui/client';

// Validate environment variables
if (!process.env.SHINAMI_GAS_STATION_ACCESS_KEY) {
  throw new Error('SHINAMI_GAS_STATION_ACCESS_KEY is not set');
}

if (!process.env.SHINAMI_NODE_ACCESS_KEY) {
  throw new Error('SHINAMI_NODE_ACCESS_KEY is not set');
}

// Get the network from environment or default to testnet
const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

/**
 * Shinami Gas Station Client
 * Used for sponsoring transactions
 */
export const gasStationClient = new GasStationClient(
  process.env.SHINAMI_GAS_STATION_ACCESS_KEY
);

/**
 * Shinami Sui Client
 * Used for reading blockchain data and executing transactions
 * Uses Mysten's SuiClient with Shinami Node Service URL
 * API key is embedded in the URL path
 */
export const suiClient = new SuiClient({
  url: `https://api.us1.shinami.com/node/v1/${process.env.SHINAMI_NODE_ACCESS_KEY}`,
});

