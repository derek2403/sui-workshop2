/**
 * API Route: Build and Sponsor Transfer Transaction
 * 
 * This endpoint:
 * 1. Receives transfer parameters (recipient address and amount)
 * 2. Builds a gasless SUI transfer transaction
 * 3. Sponsors it via Shinami Gas Station
 * 4. Returns the sponsored transaction bytes and sponsor signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildGaslessTransaction } from '@shinami/clients/sui';
import { gasStationClient, suiClient } from '@/lib/shinami-client';
import type { BuildSponsoredTxResponse, ErrorResponse } from '@/lib/types';

export interface BuildTransferTxRequest {
  sender: string;
  recipient: string;
  amount: number; // Amount in MIST (1 SUI = 1,000,000,000 MIST)
}

export async function POST(request: NextRequest) {
  try {
    const body: BuildTransferTxRequest = await request.json();
    const { sender, recipient, amount } = body;

    // Validate inputs
    if (!sender) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Sender address is required' },
        { status: 400 }
      );
    }

    if (!recipient) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Recipient address is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get the sender's SUI coins first
    const coins = await suiClient.getCoins({
      owner: sender,
      coinType: '0x2::sui::SUI',
    });

    if (!coins.data || coins.data.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Sender has no SUI coins to transfer' },
        { status: 400 }
      );
    }

    // Use the first SUI coin
    const senderCoin = coins.data[0];

    // Build a gasless SUI transfer transaction using Shinami's helper
    const gaslessTx = await buildGaslessTransaction(
      (txb) => {
        // Split from the sender's coin (not txb.gas, which doesn't exist in gasless tx)
        const [coin] = txb.splitCoins(senderCoin.coinObjectId, [amount]);
        
        // Transfer the coin to the recipient
        txb.transferObjects([coin], recipient);
      },
      { sui: suiClient }
    );

    // Set the sender
    gaslessTx.sender = sender;

    // Sponsor the transaction via Shinami Gas Station (auto-budgeting)
    const sponsoredResponse = await gasStationClient.sponsorTransaction(gaslessTx);

    // Return the sponsored transaction and signature to the frontend
    const response: BuildSponsoredTxResponse = {
      txBytes: sponsoredResponse.txBytes,
      sponsorSignature: sponsoredResponse.signature,
      digest: sponsoredResponse.txDigest,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error building/sponsoring transfer:', error);
    
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Failed to build or sponsor transfer transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

