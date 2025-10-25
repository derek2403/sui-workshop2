# Complete Shinami Gas Station Integration Guide 🚀

> A comprehensive guide to setting up gas-free transactions on Sui using Shinami Gas Station with Next.js

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Architecture](#architecture)
6. [How to Use](#how-to-use)
7. [Understanding the Code](#understanding-the-code)
8. [Testing](#testing)
9. [Production Considerations](#production-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This project demonstrates how to integrate **Shinami Gas Station** for transaction sponsorship on the Sui blockchain. Users can send transactions without paying gas fees - your Gas Station fund covers the gas costs.

### What You Get

✅ **Gas-free SUI transfers** - Send SUI without paying gas  
✅ **Sponsored Move calls** - Execute smart contract functions  
✅ **Connected wallet signing** - Users sign with their Sui wallet  
✅ **Two integration flows** - Frontend or backend submission  

### Key Concept: Gas Station vs User Wallet

- **Gas Station (Shinami)** → Pays **GAS FEES** (~0.001-0.01 SUI per tx)
- **User Wallet** → Provides **transaction content** (e.g., SUI to transfer, NFTs to move)

---

## Prerequisites

Before you begin, you need:

### 1. Software Requirements
- **Node.js** 18+ and npm
- **Git**
- A code editor (VS Code recommended)
- A **Sui wallet browser extension** (Sui Wallet, Ethos, etc.)

### 2. Shinami Account
1. Sign up at [app.shinami.com](https://app.shinami.com/signup)
2. Create a **Gas Station Fund** on Testnet
3. Create an **API Access Key** with both:
   - Node Service access
   - Gas Station access

### 3. Testnet SUI
- Get testnet SUI from [Sui Discord faucet](https://discord.gg/sui) (#testnet-faucet channel)
- Type: `!faucet YOUR_WALLET_ADDRESS`

---

## Installation

### 1. Clone or Create Project

If starting from scratch:
```bash
npx create-next-app@latest sui-gas-station-app
cd sui-gas-station-app
```

### 2. Install Dependencies

```bash
npm install @mysten/sui @mysten/dapp-kit @shinami/clients @tanstack/react-query
```

### 3. Project Structure

```
sui-workshop2/
├── app/
│   ├── api/
│   │   ├── buildSponsoredTx/route.ts      # Sponsor Move calls
│   │   ├── buildTransferTx/route.ts       # Sponsor transfers
│   │   └── executeSponsoredTx/route.ts    # Execute on backend
│   ├── layout.tsx                          # Root layout
│   └── page.tsx                            # Main UI
├── components/
│   ├── Providers.tsx                       # Wallet & React Query setup
│   └── TransferForm.tsx                    # Transfer UI component
├── lib/
│   ├── shinami-client.ts                   # Shinami SDK config
│   └── types.ts                            # TypeScript types
├── move-example/
│   └── sources/math.move                   # Example Move contract
├── .env.local                              # Environment variables (create this)
├── next.config.ts                          # Next.js configuration
└── package.json
```

---

## Configuration

### 1. Create `.env.local`

Create a `.env.local` file in the project root:

```bash
# Shinami API Keys (get from https://app.shinami.com)
SHINAMI_GAS_STATION_ACCESS_KEY=us1_sui_testnet_YOUR_KEY_HERE
SHINAMI_NODE_ACCESS_KEY=us1_sui_testnet_YOUR_KEY_HERE

# Network
NEXT_PUBLIC_SUI_NETWORK=testnet

# Move Package ID (deploy your Move package first)
NEXT_PUBLIC_MOVE_PACKAGE_ID=0xYOUR_PACKAGE_ID
```

### 2. Update `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle Shinami SDK (important for compatibility)
  serverExternalPackages: ['@shinami/clients'],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@shinami/clients'];
    }
    return config;
  },
};

export default nextConfig;
```

### 3. Set Up Shinami Clients (`lib/shinami-client.ts`)

```typescript
import { GasStationClient } from '@shinami/clients/sui';
import { SuiClient } from '@mysten/sui/client';

if (!process.env.SHINAMI_GAS_STATION_ACCESS_KEY) {
  throw new Error('SHINAMI_GAS_STATION_ACCESS_KEY is not set');
}

if (!process.env.SHINAMI_NODE_ACCESS_KEY) {
  throw new Error('SHINAMI_NODE_ACCESS_KEY is not set');
}

const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

export const gasStationClient = new GasStationClient(
  process.env.SHINAMI_GAS_STATION_ACCESS_KEY
);

export const suiClient = new SuiClient({
  url: `https://api.us1.shinami.com/node/v1/${process.env.SHINAMI_NODE_ACCESS_KEY}`,
});
```

---

## Architecture

### Transaction Flow

```
┌─────────────┐
│   Frontend  │
│   (Browser) │
└──────┬──────┘
       │ 1. Request to sponsor transaction
       │    (sender address + tx params)
       ▼
┌─────────────┐
│   Backend   │
│  (Next.js)  │
├─────────────┤
│ 2. Build    │ buildGaslessTransaction()
│    gasless  │ 
│    tx       │
├─────────────┤
│ 3. Sponsor  │ gasStationClient.sponsorTransaction()
│    via      │
│    Shinami  │ ──────────► Shinami Gas Station
└──────┬──────┘              (adds gas object + sponsor sig)
       │ 4. Return sponsored tx + signature
       ▼
┌─────────────┐
│   Frontend  │
├─────────────┤
│ 5. User     │ wallet.signTransaction()
│    signs    │
├─────────────┤
│ 6. Execute  │ suiClient.executeTransactionBlock()
│    with     │ (tx + both signatures)
│    both     │ ──────────► Sui Blockchain
│    sigs     │
└─────────────┘
       │ 7. Transaction confirmed ✅
       ▼
    Success!
```

### Key Components

**Frontend:**
- `Providers.tsx` - Sets up Sui dApp Kit and React Query
- `TransferForm.tsx` - UI for gas-free transfers
- `page.tsx` - Main application page

**Backend API Routes:**
- `buildSponsoredTx` - Builds and sponsors Move call transactions
- `buildTransferTx` - Builds and sponsors SUI transfers
- `executeSponsoredTx` - Optional backend execution flow

**Configuration:**
- `lib/shinami-client.ts` - Shinami SDK initialization
- `lib/types.ts` - TypeScript interfaces

---

## How to Use

### 1. Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 2. Connect Your Wallet

1. Click **"Connect Wallet"** button
2. Select your Sui wallet (make sure it's on Testnet)
3. Approve the connection

### 3. Transfer SUI (Gas-Free!)

**Requirements:**
- Your wallet needs SUI for the transfer amount
- Shinami pays the gas fees

**Steps:**
1. Enter recipient address
2. Enter amount (e.g., 0.1 SUI)
3. Click "Send SUI (Gas-Free)"
4. Approve in wallet popup
5. ✅ Transaction executes - gas paid by Shinami!

### 4. Try the Math Demo

**Requirements:**
- No SUI needed in wallet!
- Just calls a Move function

**Steps:**
1. Enter two numbers
2. Click "Submit on Frontend" or "Submit on Backend"
3. Approve in wallet
4. ✅ Works even with empty wallet!

---

## Understanding the Code

### Critical Pattern: Using `buildGaslessTransaction`

**❌ WRONG (doesn't work):**
```typescript
const tx = new Transaction();
tx.moveCall({ ... });
const txBytes = await tx.build({ client, onlyTransactionKind: true });
const txKind = toB64(txBytes);
await gasStationClient.sponsorTransaction({ txKind, sender });
```

**✅ CORRECT (works):**
```typescript
import { buildGaslessTransaction } from '@shinami/clients/sui';

const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    txb.moveCall({ ... });
  },
  { sui: suiClient }
);

gaslessTx.sender = sender;
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);
```

### Important Rules

1. **Cannot use `txb.gas` in gasless transactions**
   - The gas object doesn't exist yet
   - Use sender's coins instead

2. **Must use sender's owned objects**
   - For transfers, fetch sender's coins first
   - Split from those coins, not `txb.gas`

3. **Shinami URL format**
   - Use: `https://api.us1.shinami.com/node/v1/YOUR_KEY`
   - API key embedded in URL path

4. **Two signatures required**
   - Sponsor signature (from Gas Station)
   - Sender signature (from user's wallet)

### Example: SUI Transfer

```typescript
// 1. Get sender's coins
const coins = await suiClient.getCoins({
  owner: sender,
  coinType: '0x2::sui::SUI',
});

// 2. Build gasless transaction
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    // Split from sender's coin (NOT txb.gas!)
    const [coin] = txb.splitCoins(coins.data[0].coinObjectId, [amount]);
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);

// 3. Set sender and sponsor
gaslessTx.sender = sender;
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);

// 4. Frontend signs
const { signature } = await signTransaction({
  transaction: sponsored.txBytes
});

// 5. Execute with both signatures
await suiClient.executeTransactionBlock({
  transactionBlock: sponsored.txBytes,
  signature: [signature, sponsored.signature],
});
```

---

## Testing

### Verify a Transaction is Sponsored

Check on [Suiscan](https://suiscan.xyz/testnet) or [Suivision](https://testnet.suivision.xyz/):

**Key Indicators:**
1. ✅ **Two signatures present** (User + Sponsor)
2. ✅ **Gas Object Owner ≠ Sender**
3. ✅ **"Sponsor Signature" field exists**

### Test Checklist

- [ ] Wallet connects successfully
- [ ] Transfer form validates inputs
- [ ] Math demo works with empty wallet
- [ ] Transfer works with wallet that has SUI
- [ ] Both "Submit on Frontend" and "Submit on Backend" work
- [ ] Transactions appear in Shinami Dashboard
- [ ] Gas fees deducted from Gas Station fund, not user

---

## Production Considerations

### Security

✅ **API Keys on Backend Only**
- Never expose Gas Station keys in frontend code
- Use Next.js API routes for all sponsorship requests

✅ **Input Validation**
- Validate all user inputs on backend
- Check sender owns required objects
- Verify transaction correctness

✅ **Rate Limiting**
- Implement rate limiting on API routes
- Prevent abuse of Gas Station fund

### Monitoring

Monitor your Gas Station in [Shinami Dashboard](https://app.shinami.com/sui/gas):

- **Fund Balance** - Ensure adequate SUI
- **Completed Transactions** - Review sponsored txs
- **In-Flight Transactions** - Track pending sponsorships
- **Usage Metrics** - Monitor costs

### Optimization

**Auto-budgeting (Recommended):**
- Omit `gasBudget` parameter
- Shinami estimates gas automatically
- Adds 5% buffer for regular txs, 25% for shared objects

**Manual budgeting (Advanced):**
- Set `gaslessTx.gasBudget` explicitly
- Faster but requires careful tuning
- Risk of transaction failure if too low

### Scaling

- Set up alerts for low Gas Station balance
- Configure auto-refill for your fund
- Monitor per-user spending patterns
- Implement spending limits if needed

---

## Troubleshooting

### Common Issues

#### "Failed to parse URL"
**Solution:** Make sure you're using the correct Shinami URL format:
```typescript
url: `https://api.us1.shinami.com/node/v1/${YOUR_API_KEY}`
```

#### "Invalid params" (-32602)
**Causes:**
- Using `txb.gas` in gasless transaction ❌
- Incorrect `GaslessTransaction` format ❌

**Solution:** Use `buildGaslessTransaction` from Shinami SDK ✅

#### "Sender has no SUI coins to transfer"
**Cause:** User's wallet is empty

**Solution:** 
- Get testnet SUI from faucet
- Remember: Gas Station pays gas, user provides transfer amount

#### "realFetch.call is not a function"
**Solution:** Add to `next.config.ts`:
```typescript
serverExternalPackages: ['@shinami/clients']
```

### Getting Help

- **Shinami Docs:** https://docs.shinami.com
- **Shinami Support:** support@shinami.com
- **Sui Discord:** https://discord.gg/sui
- **Example Code:** https://github.com/shinamicorp/shinami-examples

---

## Next Steps

### Extend the Application

1. **Add More Transaction Types**
   - NFT transfers
   - Token swaps  
   - Complex Move calls

2. **Improve UX**
   - Transaction history
   - Real-time status updates
   - Better error messages

3. **Add Authentication**
   - Protect API routes
   - Per-user rate limits
   - User allowlists

4. **Deploy to Production**
   - Use Mainnet Gas Station fund
   - Set up monitoring and alerts
   - Implement proper security

### Learn More

- [Shinami Gas Station Tutorial](https://docs.shinami.com/developer-guides/sui/tutorials/gas-station-backend-only)
- [Sui Programmable Transactions](https://docs.sui.io/guides/developer/sui-101/building-ptb)
- [Sui dApp Kit Documentation](https://sdk.mystenlabs.com/dapp-kit)

---

## Summary

You now have a fully functional Shinami Gas Station integration! 🎉

**What you built:**
✅ Gas-free SUI transfers  
✅ Sponsored Move call transactions  
✅ Connected wallet signing flow  
✅ Production-ready architecture  

**Key takeaways:**
- Always use `buildGaslessTransaction` helper
- Never use `txb.gas` in gasless transactions
- Keep API keys on backend only
- User provides transaction content, Shinami pays gas

**Remember:**
- Gas Station pays **GAS FEES** (~0.001 SUI)
- User provides **TRANSACTION CONTENT** (SUI to transfer, etc.)
- Together = Seamless, gas-free user experience! 🚀

---

Made with ❤️ using [Shinami Gas Station](https://www.shinami.com)


