'use client';

/**
 * Main Page Component
 * 
 * Demonstrates two flows for Shinami Gas Station integration:
 * 1. Build and sponsor on BE, sign and submit on FE
 * 2. Build and sponsor on BE, sign on FE, submit on BE
 */

import { useState } from 'react';
import { 
  ConnectButton, 
  useCurrentAccount, 
  useSignTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
import { TransferForm } from '@/components/TransferForm';
import type { 
  BuildSponsoredTxRequest, 
  BuildSponsoredTxResponse,
  ExecuteSponsoredTxResponse,
} from '@/lib/types';

export default function Home() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const suiClient = useSuiClient();

  const [num1, setNum1] = useState<string>('10');
  const [num2, setNum2] = useState<string>('20');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  /**
   * Flow 1: Build and sponsor on BE, sign and submit on FE
   */
  const handleFrontendSubmit = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      // Step 1: Request backend to build and sponsor the transaction
      const buildRequest: BuildSponsoredTxRequest = {
        sender: currentAccount.address,
        num1: parseInt(num1),
        num2: parseInt(num2),
      };

      const buildResponse = await fetch('/api/buildSponsoredTx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        throw new Error(errorData.error || 'Failed to build transaction');
      }

      const sponsoredTx: BuildSponsoredTxResponse = await buildResponse.json();

      // Step 2: Sign the transaction with the connected wallet
      const { signature: senderSignature } = await signTransaction({
        transaction: sponsoredTx.txBytes,
      });

      // Step 3: Submit the transaction with both signatures
      const executeResult = await suiClient.executeTransactionBlock({
        transactionBlock: sponsoredTx.txBytes,
        signature: [senderSignature, sponsoredTx.sponsorSignature],
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      // Step 4: Display the result
      setResult(`Transaction successful! Digest: ${executeResult.digest}`);
      console.log('Transaction result:', executeResult);

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Flow 2: Build and sponsor on BE, sign on FE, submit on BE
   */
  const handleBackendSubmit = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      // Step 1: Request backend to build and sponsor the transaction
      const buildRequest: BuildSponsoredTxRequest = {
        sender: currentAccount.address,
        num1: parseInt(num1),
        num2: parseInt(num2),
      };

      const buildResponse = await fetch('/api/buildSponsoredTx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        throw new Error(errorData.error || 'Failed to build transaction');
      }

      const sponsoredTx: BuildSponsoredTxResponse = await buildResponse.json();

      // Step 2: Sign the transaction with the connected wallet
      const { signature: senderSignature } = await signTransaction({
        transaction: sponsoredTx.txBytes,
      });

      // Step 3: Send to backend for submission
      const executeResponse = await fetch('/api/executeSponsoredTx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txBytes: sponsoredTx.txBytes,
          sponsorSignature: sponsoredTx.sponsorSignature,
          senderSignature: senderSignature,
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json();
        throw new Error(errorData.error || 'Failed to execute transaction');
      }

      const executeResult: ExecuteSponsoredTxResponse = await executeResponse.json();

      // Step 4: Display the result
      setResult(`Transaction successful! Digest: ${executeResult.digest}`);
      console.log('Transaction result:', executeResult);

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Shinami Gas Station Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Connected Wallet Signing with Transaction Sponsorship
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>

        {/* Main Content */}
        {currentAccount ? (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Transfer Form */}
            <TransferForm senderAddress={currentAccount.address} />

            {/* Original Demo Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Send a Sponsored Transaction
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connected as: <span className="font-mono">{currentAccount.address.slice(0, 10)}...{currentAccount.address.slice(-8)}</span>
              </p>
            </div>

            {/* Transaction Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="num1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number 1
                  </label>
                  <input
                    id="num1"
                    type="number"
                    value={num1}
                    onChange={(e) => setNum1(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="num2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number 2
                  </label>
                  <input
                    id="num2"
                    type="number"
                    value={num2}
                    onChange={(e) => setNum2(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Flow Buttons */}
              <div className="space-y-4">
                <div>
                  <button
                    onClick={handleFrontendSubmit}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Processing...' : 'Submit on Frontend (Flow 1)'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Build + Sponsor on BE → Sign on FE → Submit on FE
                  </p>
                </div>

                <div>
                  <button
                    onClick={handleBackendSubmit}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Processing...' : 'Submit on Backend (Flow 2)'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Build + Sponsor on BE → Sign on FE → Submit on BE
                  </p>
                </div>
              </div>

              {/* Result Display */}
              {result && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                    Success!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400 break-all">
                    {result}
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                    Error
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                About This Demo
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  This demo shows how to integrate Shinami Gas Station with connected browser wallets.
                </p>
                <p>
                  <strong>Flow 1 (Frontend Submit):</strong> Backend builds and sponsors the transaction, frontend signs and submits to the chain.
                </p>
                <p>
                  <strong>Flow 2 (Backend Submit):</strong> Backend builds and sponsors the transaction, frontend signs, backend submits to the chain.
                </p>
                <p className="text-xs mt-4 text-gray-500 dark:text-gray-500">
                  Note: Make sure you have configured your Shinami API keys and Move package ID in the environment variables.
                </p>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-12 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Please connect your Sui wallet to start sending sponsored transactions.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Built with{' '}
            <a
              href="https://docs.shinami.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Shinami Gas Station
            </a>
            {' '}&{' '}
            <a
              href="https://sdk.mystenlabs.com/dapp-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sui dApp Kit
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
