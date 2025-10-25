# Gasless Transactions - Quick Reference Card 📋

**Print this out or share with workshop attendees!**

---

## Core Concepts

### What is a Gas Station?
A service that **pays gas fees on behalf of users**.

```
Traditional:  User pays transfer + gas
Gas Station:  User pays transfer, App pays gas
```

### Two Signatures Required
```
User Signature    = "I approve this transaction"
Sponsor Signature = "I'll pay the gas"
```

---

## Essential Code Patterns

### 1. Initialize Shinami Clients
```typescript
// lib/shinami-client.ts
import { GasStationClient } from '@shinami/clients/sui';
import { SuiClient } from '@mysten/sui/client';

export const gasStationClient = new GasStationClient(
  process.env.SHINAMI_GAS_STATION_ACCESS_KEY
);

export const suiClient = new SuiClient({
  url: `https://api.us1.shinami.com/node/v1/${process.env.SHINAMI_NODE_ACCESS_KEY}`
});
```

---

### 2. Build Gasless Transaction (Backend)
```typescript
import { buildGaslessTransaction } from '@shinami/clients/sui';
import { gasStationClient, suiClient } from '@/lib/shinami-client';

// Build
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    // Your transaction logic here
    txb.moveCall({ target: `${pkg}::module::function`, arguments: [...] });
  },
  { sui: suiClient }
);

// Set sender
gaslessTx.sender = sender;

// Sponsor
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);

// Return to frontend
return {
  txBytes: sponsored.txBytes,
  sponsorSignature: sponsored.signature,
  digest: sponsored.txDigest
};
```

---

### 3. Sign & Execute (Frontend)
```typescript
import { useSignTransaction, useSuiClient } from '@mysten/dapp-kit';

const { mutateAsync: signTransaction } = useSignTransaction();
const suiClient = useSuiClient();

// Step 1: Request backend to sponsor
const response = await fetch('/api/buildSponsoredTx', {
  method: 'POST',
  body: JSON.stringify({ sender, ...params })
});
const { txBytes, sponsorSignature } = await response.json();

// Step 2: User signs
const { signature: senderSignature } = await signTransaction({
  transaction: txBytes
});

// Step 3: Execute with both signatures
const result = await suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [senderSignature, sponsorSignature]  // Order matters!
});
```

---

### 4. SUI Transfer Pattern
```typescript
// Fetch sender's coins first
const coins = await suiClient.getCoins({
  owner: sender,
  coinType: '0x2::sui::SUI'
});

// Build gasless transfer
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    // Use sender's coin, NOT txb.gas!
    const [coin] = txb.splitCoins(coins.data[0].coinObjectId, [amount]);
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);
```

---

### 5. Move Call Pattern
```typescript
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    txb.moveCall({
      target: `${packageId}::module_name::function_name`,
      arguments: [
        txb.pure.u64(123),
        txb.pure.string("hello"),
        txb.pure.address("0x...")
      ]
    });
  },
  { sui: suiClient }
);
```

---

## Project Structure Template

```
your-project/
├── app/
│   ├── api/                    # Backend API routes
│   │   ├── buildSponsoredTx/
│   │   │   └── route.ts       # ← Sponsor Move calls
│   │   └── buildTransferTx/
│   │       └── route.ts       # ← Sponsor transfers
│   ├── layout.tsx
│   └── page.tsx               # ← Main UI
├── components/
│   ├── Providers.tsx          # ← Wallet setup
│   └── YourComponent.tsx
├── lib/
│   ├── shinami-client.ts      # ← SDK initialization ⭐
│   └── types.ts
├── .env.local                 # ← API keys (don't commit!)
├── next.config.ts
└── package.json
```

---

## Environment Variables

```bash
# .env.local
SHINAMI_GAS_STATION_ACCESS_KEY=us1_sui_testnet_xxxxx
SHINAMI_NODE_ACCESS_KEY=us1_sui_testnet_xxxxx
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_MOVE_PACKAGE_ID=0xYOUR_PACKAGE_ID
```

**Get API keys:** [app.shinami.com](https://app.shinami.com)

---

## Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@shinami/clients'],  // Important!
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@shinami/clients'];
    }
    return config;
  },
};

export default nextConfig;
```

---

## Golden Rules

### ✅ DO
- ✅ Use `buildGaslessTransaction()` from Shinami SDK
- ✅ Use sender's coins for splits (not `txb.gas`)
- ✅ Keep API keys on backend only
- ✅ Execute with both signatures: `[userSig, sponsorSig]`
- ✅ Validate all user inputs
- ✅ Set up rate limiting in production
- ✅ Monitor your Gas Station fund balance

### ❌ DON'T
- ❌ Manually build transaction bytes
- ❌ Use `txb.gas` in gasless transactions
- ❌ Expose Gas Station API keys to frontend
- ❌ Skip `serverExternalPackages` in Next.js config
- ❌ Forget signature order matters
- ❌ Ignore rate limiting
- ❌ Let your fund run empty

---

## Common Errors & Fixes

### Error: "Invalid params" (-32602)
**Cause:** Not using `buildGaslessTransaction()`  
**Fix:** Always use the Shinami helper function

### Error: "realFetch.call is not a function"
**Cause:** Missing Next.js webpack config  
**Fix:** Add `serverExternalPackages: ['@shinami/clients']`

### Error: "Sender has no SUI coins"
**Cause:** Wallet empty, trying to transfer  
**Fix:** Get testnet SUI from faucet  
**Note:** Gas Station pays gas, NOT transfer amount!

### Error: Using `txb.gas`
**Cause:** `txb.gas` doesn't exist in gasless transactions  
**Fix:** Fetch and use sender's coins instead

### Error: Wrong signature order
**Cause:** `[sponsorSig, userSig]` instead of `[userSig, sponsorSig]`  
**Fix:** User signature first, sponsor second

---

## Complete Transaction Flow

```
┌─────────────┐
│  Frontend   │ 1. POST /api/buildSponsoredTx
└──────┬──────┘    { sender, params }
       │
       ▼
┌─────────────┐
│   Backend   │ 2. buildGaslessTransaction(...)
│   API       │ 3. gasStationClient.sponsorTransaction(...)
└──────┬──────┘ 4. Return { txBytes, sponsorSignature }
       │
       ▼
┌─────────────┐
│  Frontend   │ 5. wallet.signTransaction(txBytes)
└──────┬──────┘    → User approves in wallet popup
       │           → Returns senderSignature
       ▼
┌─────────────┐
│  Frontend   │ 6. suiClient.executeTransactionBlock({
│     or      │      txBytes,
│   Backend   │      signature: [senderSig, sponsorSig]
└──────┬──────┘    })
       │
       ▼
┌─────────────┐
│     Sui     │ 7. Validates both signatures
│ Blockchain  │ 8. Executes transaction
└──────┬──────┘ 9. Returns result
       │
       ▼
    SUCCESS! 🎉
```

---

## TypeScript Types

```typescript
// Request to build sponsored tx
interface BuildSponsoredTxRequest {
  sender: string;
  // Add your params
}

// Response with sponsored tx
interface BuildSponsoredTxResponse {
  txBytes: string;
  sponsorSignature: string;
  digest: string;
}

// Execute tx request
interface ExecuteSponsoredTxRequest {
  txBytes: string;
  sponsorSignature: string;
  senderSignature: string;
}
```

---

## Wallet Setup (Frontend)

```typescript
// components/Providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  
  const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') }
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
```

---

## Useful Hooks

```typescript
import {
  ConnectButton,
  useCurrentAccount,
  useSignTransaction,
  useSuiClient
} from '@mysten/dapp-kit';

// In your component:
const currentAccount = useCurrentAccount();        // Get connected wallet
const { mutateAsync: signTransaction } = useSignTransaction();  // Sign txs
const suiClient = useSuiClient();                 // Blockchain client

// Usage:
if (currentAccount) {
  const address = currentAccount.address;
  // User is connected
}
```

---

## Dependencies to Install

```bash
npm install @mysten/sui @mysten/dapp-kit @shinami/clients @tanstack/react-query
```

```json
{
  "@mysten/dapp-kit": "^0.19.6",
  "@mysten/sui": "^1.43.1",
  "@shinami/clients": "^0.9.7",
  "@tanstack/react-query": "^5.90.5"
}
```

---

## Testing Checklist

- [ ] Wallet connects successfully
- [ ] Transfer form validates inputs
- [ ] Can transfer SUI with gas sponsorship
- [ ] Can call Move functions with sponsorship
- [ ] Transactions appear in Shinami Dashboard
- [ ] Gas fees deducted from Gas Station (not user)
- [ ] Two signatures visible on block explorer
- [ ] Error handling works (empty wallet, invalid inputs)

---

## Production Checklist

- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] User authentication/authorization
- [ ] Monitoring & alerts (fund balance)
- [ ] Error logging
- [ ] Per-user spending limits
- [ ] Using mainnet API keys
- [ ] Tested with real users
- [ ] Documentation for team
- [ ] Backup plan if fund runs low

---

## Resources

### Official Docs
- **Shinami Docs:** https://docs.shinami.com
- **Shinami Dashboard:** https://app.shinami.com
- **Sui Docs:** https://docs.sui.io
- **dApp Kit:** https://sdk.mystenlabs.com/dapp-kit

### Code Examples
- **Workshop Repo:** [your-repo-link]
- **Shinami Examples:** https://github.com/shinamicorp/shinami-examples

### Community
- **Sui Discord:** https://discord.gg/sui
- **Shinami Support:** support@shinami.com

### Get Testnet SUI
- **Discord Faucet:** Join Sui Discord → #testnet-faucet → `!faucet YOUR_ADDRESS`

---

## Cost Estimates

**Typical Transaction Costs:**
- Simple Move call: ~0.001 SUI (~$0.001)
- SUI transfer: ~0.001 SUI (~$0.001)
- Complex transaction: ~0.01 SUI (~$0.01)
- NFT mint: ~0.005 SUI (~$0.005)

**Budget Planning:**
- 1 SUI = ~1,000 transactions
- $100 = ~100,000 transactions
- Monitor in Shinami Dashboard!

---

## One-Liner Summary

> **Gas Station = Your app pays tiny gas fees (~$0.001), users get seamless Web3 experience**

---

## Copy-Paste Snippets

### Complete API Route Example
```typescript
// app/api/buildSponsoredTx/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildGaslessTransaction } from '@shinami/clients/sui';
import { gasStationClient, suiClient } from '@/lib/shinami-client';

export async function POST(request: NextRequest) {
  try {
    const { sender, num1, num2 } = await request.json();
    
    if (!sender) {
      return NextResponse.json({ error: 'Sender required' }, { status: 400 });
    }

    const gaslessTx = await buildGaslessTransaction(
      (txb) => {
        txb.moveCall({
          target: `${process.env.NEXT_PUBLIC_MOVE_PACKAGE_ID}::math::add`,
          arguments: [txb.pure.u64(num1), txb.pure.u64(num2)]
        });
      },
      { sui: suiClient }
    );

    gaslessTx.sender = sender;
    const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);

    return NextResponse.json({
      txBytes: sponsored.txBytes,
      sponsorSignature: sponsored.signature,
      digest: sponsored.txDigest
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sponsor', details: error.message },
      { status: 500 }
    );
  }
}
```

### Complete Frontend Example
```typescript
// Your React component
const handleSubmit = async () => {
  // 1. Request sponsorship
  const response = await fetch('/api/buildSponsoredTx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: currentAccount.address, num1, num2 })
  });
  const { txBytes, sponsorSignature } = await response.json();

  // 2. Sign
  const { signature: senderSignature } = await signTransaction({
    transaction: txBytes
  });

  // 3. Execute
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: [senderSignature, sponsorSignature]
  });

  console.log('Success!', result.digest);
};
```

---

**Happy Building! 🚀**

*Questions? Check the full WORKSHOP_GUIDE.md or reach out to the community!*

