'use client';

/**
 * Transfer Form Component
 * 
 * Allows users to transfer SUI to another address with gas sponsored by Shinami
 */

import { useState } from 'react';
import { useSignTransaction, useSuiClient } from '@mysten/dapp-kit';
import type { BuildSponsoredTxResponse } from '@/lib/types';

interface TransferFormProps {
  senderAddress: string;
}

export function TransferForm({ senderAddress }: TransferFormProps) {
  const { mutateAsync: signTransaction } = useSignTransaction();
  const suiClient = useSuiClient();

  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('0.1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleTransfer = async () => {
    if (!recipient) {
      setError('Please enter a recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      // Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
      const amountInMist = Math.floor(amountNum * 1_000_000_000);

      // Step 1: Request backend to build and sponsor the transfer
      const buildResponse = await fetch('/api/buildTransferTx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: senderAddress,
          recipient: recipient.trim(),
          amount: amountInMist,
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        throw new Error(errorData.error || 'Failed to build transfer');
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
      setResult(
        `Transfer successful! ${amountNum} SUI sent to ${recipient.slice(0, 10)}...${recipient.slice(-8)}\n` +
        `Transaction digest: ${executeResult.digest}`
      );
      console.log('Transfer result:', executeResult);

      // Clear form
      setRecipient('');
      setAmount('0.1');

    } catch (err) {
      console.error('Transfer error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          💸 Transfer SUI (Gas-Free!)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Send SUI to any address - gas fees sponsored by Shinami
        </p>
      </div>

      <div className="space-y-4">
        {/* Recipient Address */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
            disabled={loading}
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount (SUI)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.000000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            1 SUI = 1,000,000,000 MIST
          </p>
        </div>

        {/* Transfer Button */}
        <button
          onClick={handleTransfer}
          disabled={loading || !recipient || !amount}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? '🔄 Processing Transfer...' : '💸 Send SUI (Gas-Free)'}
        </button>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">⚠️ Important:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Your wallet needs SUI</strong> for the transfer amount</li>
                <li><strong>Shinami pays gas fees</strong> (you save on gas!)</li>
                <li>Get testnet SUI from <a href="https://discord.gg/sui" target="_blank" rel="noopener" className="underline">Sui Discord faucet</a></li>
                <li>Example: Transfer 0.1 SUI → You pay 0.1, Shinami pays gas</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
              ✅ Success!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap break-all">
              {result}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
              ❌ Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

