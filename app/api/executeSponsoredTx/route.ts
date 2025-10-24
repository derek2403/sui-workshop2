/**
 * API Route: Execute Sponsored Transaction
 * 
 * This endpoint:
 * 1. Receives a sponsored transaction and both signatures (sponsor + sender)
 * 2. Submits the transaction to the Sui network
 * 3. Returns the transaction response
 * 
 * This is used for the "submit on backend" flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { suiClient } from '@/lib/shinami-client';
import type { ExecuteSponsoredTxRequest, ExecuteSponsoredTxResponse, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteSponsoredTxRequest = await request.json();
    const { txBytes, sponsorSignature, senderSignature } = body;

    if (!txBytes || !sponsorSignature || !senderSignature) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Transaction bytes, sponsor signature, and sender signature are all required' },
        { status: 400 }
      );
    }

    // Execute the transaction with both signatures
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: [senderSignature, sponsorSignature],
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    const response: ExecuteSponsoredTxResponse = {
      ...result,
      digest: result.digest,
      effects: result.effects,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error executing transaction:', error);
    
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Failed to execute transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


