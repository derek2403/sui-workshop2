/**
 * API Route: Build and Sponsor Transaction
 * 
 * This endpoint:
 * 1. Receives transaction parameters from the frontend
 * 2. Builds a gasless transaction
 * 3. Sponsors it via Shinami Gas Station
 * 4. Returns the sponsored transaction bytes and sponsor signature to the frontend
 * 
 * The frontend will then sign and submit the transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildGaslessTransaction } from '@shinami/clients/sui';
import { gasStationClient, suiClient } from '@/lib/shinami-client';
import type { BuildSponsoredTxRequest, BuildSponsoredTxResponse, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: BuildSponsoredTxRequest = await request.json();
    const { sender, num1, num2 } = body;

    if (!sender) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Sender address is required' },
        { status: 400 }
      );
    }

    // Get package ID from env
    const packageId = process.env.NEXT_PUBLIC_MOVE_PACKAGE_ID;
    
    if (!packageId) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Move package ID not configured',
          details: 'Set NEXT_PUBLIC_MOVE_PACKAGE_ID in your environment variables'
        },
        { status: 500 }
      );
    }

    // Build a gasless transaction using Shinami's helper
    const gaslessTx = await buildGaslessTransaction(
      (txb) => {
        if (num1 !== undefined && num2 !== undefined) {
          txb.moveCall({
            target: `${packageId}::math::add`,
            arguments: [
              txb.pure.u64(num1),
              txb.pure.u64(num2),
            ],
          });
        } else {
          txb.moveCall({
            target: `${packageId}::math::hello_world`,
            arguments: [],
          });
        }
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
    console.error('Error building/sponsoring transaction:', error);
    
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Failed to build or sponsor transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

