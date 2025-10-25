# Gasless Transactions Workshop Guide 🚀
## 1-Hour Workshop on Sui Gas Station with Shinami

---

## 📚 Table of Contents

1. [What is a Gas Station?](#1-what-is-a-gas-station)
2. [How Transaction Sponsorship Works](#2-how-transaction-sponsorship-works)
3. [Implementation Architecture](#3-implementation-architecture)
4. [Codebase Walkthrough](#4-codebase-walkthrough)
5. [Code Block-by-Block Explanations](#5-code-block-by-block-explanations)
6. [Live Demo Flow](#6-live-demo-flow)
7. [Common Pitfalls & Solutions](#7-common-pitfalls--solutions)

---

## 1. What is a Gas Station? ⛽

### The Problem
In blockchain, **every transaction costs gas fees**. This creates friction:
- ❌ Users need native tokens before they can use your dApp
- ❌ Poor onboarding experience ("Get tokens first!")
- ❌ Users abandon your app before trying it

### The Solution: Gas Station
A **Gas Station** is a service that **pays gas fees on behalf of users**.

```
Traditional Transaction:
┌──────────┐
│   User   │ → Pays BOTH:
└──────────┘   • Transaction content (e.g., 1 SUI to transfer)
               • Gas fee (0.001 SUI)

With Gas Station:
┌──────────┐
│   User   │ → Pays ONLY:
└──────────┘   • Transaction content (1 SUI to transfer)

┌──────────────┐
│ Gas Station  │ → Pays:
│  (Shinami)   │   • Gas fee (0.001 SUI)
└──────────────┘
```

### Real-World Example
**Transferring 0.1 SUI:**
- **Without Gas Station:** User pays 0.1 SUI + 0.001 SUI gas = **0.101 SUI**
- **With Gas Station:** User pays 0.1 SUI, Shinami pays 0.001 SUI gas = **0.1 SUI**

### Why Shinami Gas Station?
- 🔥 **Easiest integration** - Simple SDK, no complex setup
- 💰 **Pay-as-you-go** - Only pay for gas you sponsor
- 📊 **Dashboard monitoring** - Track usage and costs
- ⚡ **Auto-budgeting** - Automatically calculates gas needed

---

## 2. How Transaction Sponsorship Works 🔄

### Key Concept: Two Signatures
A sponsored transaction requires **TWO signatures**:

1. **User Signature** = "I approve this transaction content"
2. **Sponsor Signature** = "I'll pay the gas for this transaction"

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SPONSORED TRANSACTION FLOW                │
└─────────────────────────────────────────────────────────────┘

Step 1: USER REQUEST
┌──────────┐
│ Frontend │ → "I want to transfer 0.1 SUI to Bob"
│ (Browser)│    • Sender address: 0xALICE
└────┬─────┘    • Recipient: 0xBOB
     │          • Amount: 0.1 SUI
     ▼

Step 2: BUILD GASLESS TRANSACTION
┌──────────┐
│ Backend  │ → buildGaslessTransaction((txb) => {
│ API      │      txb.splitCoins(...)
└────┬─────┘      txb.transferObjects(...)
     │          })
     │          • Creates transaction WITHOUT gas object
     ▼

Step 3: SPONSOR VIA SHINAMI
┌──────────┐
│ Backend  │ → gasStationClient.sponsorTransaction(tx)
└────┬─────┘    
     │    ┌─────────────────────────────────┐
     ├───►│   Shinami Gas Station Service   │
     │    │  1. Adds gas object from fund   │
     │    │  2. Signs with sponsor key      │
     │◄───┤  3. Returns sponsored tx bytes  │
     │    └─────────────────────────────────┘
     ▼
     Returns to frontend:
     • txBytes (transaction ready to sign)
     • sponsorSignature (Shinami's signature)

Step 4: USER SIGNS
┌──────────┐
│ Frontend │ → wallet.signTransaction(txBytes)
└────┬─────┘    • User approves in wallet popup
     │          • Creates user's signature
     ▼

Step 5: EXECUTE WITH BOTH SIGNATURES
┌──────────┐
│ Frontend │ → suiClient.executeTransactionBlock({
│   or     │      transactionBlock: txBytes,
│ Backend  │      signature: [userSig, sponsorSig]
└────┬─────┘    })
     │
     ▼
┌─────────────────┐
│ Sui Blockchain  │ → Validates BOTH signatures
│                 │   ✅ User authorized content
└────┬────────────┘   ✅ Sponsor authorized gas payment
     │
     ▼
  SUCCESS! 🎉
  Transaction completed with sponsored gas
```

### Critical Rules

#### ✅ DO:
- Use `buildGaslessTransaction()` helper from Shinami SDK
- Use sender's owned coins for splits/transfers
- Keep API keys on backend only
- Execute with BOTH signatures: `[userSig, sponsorSig]`

#### ❌ DON'T:
- Use `txb.gas` in gasless transactions (gas object doesn't exist yet!)
- Manually build transaction bytes
- Expose Gas Station API keys to frontend
- Try to execute with only one signature

---

## 3. Implementation Architecture 🏗️

### Project Structure

```
sui-workshop2/
├── 🎨 FRONTEND LAYER
│   ├── app/
│   │   ├── page.tsx              ← Main UI (demo forms)
│   │   └── layout.tsx            ← Root layout wrapper
│   └── components/
│       ├── Providers.tsx         ← Wallet & React Query setup
│       └── TransferForm.tsx      ← SUI transfer UI
│
├── ⚙️ BACKEND LAYER (API Routes)
│   └── app/api/
│       ├── buildSponsoredTx/     ← Sponsor Move calls
│       │   └── route.ts
│       ├── buildTransferTx/      ← Sponsor transfers
│       │   └── route.ts
│       └── executeSponsoredTx/   ← Backend execution
│           └── route.ts
│
├── 🔧 CONFIGURATION LAYER
│   ├── lib/
│   │   ├── shinami-client.ts    ← SDK initialization
│   │   └── types.ts             ← TypeScript interfaces
│   └── .env.local               ← API keys (create this!)
│
└── 📦 SMART CONTRACTS
    └── move-example/
        └── sources/
            └── math.move        ← Demo Move module
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  • React Components (UI)                                     │
│  • Wallet Connection (@mysten/dapp-kit)                      │
│  • Transaction Signing                                       │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             │ HTTP POST                      │ Execute
             │ (sender + params)              │ (txBytes + sigs)
             ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│                      BACKEND API ROUTES                       │
│  • /api/buildSponsoredTx    → Sponsor Move calls             │
│  • /api/buildTransferTx     → Sponsor transfers              │
│  • /api/executeSponsoredTx  → Execute on backend (optional)  │
└────────┬──────────────────────────────────┬─────────────────┘
         │                                  │
         │ buildGaslessTransaction()        │
         │ gasStationClient.sponsor()       │
         ▼                                  ▼
┌───────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                            │
│  ┌─────────────────────────┐  ┌──────────────────────────┐   │
│  │  Shinami Gas Station    │  │  Shinami Node Service    │   │
│  │  • Sponsors transactions│  │  • RPC endpoints         │   │
│  │  • Provides gas         │  │  • Read blockchain data  │   │
│  └─────────────────────────┘  └──────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Sui Blockchain    │
                    │   (Testnet/Mainnet) │
                    └─────────────────────┘
```

---

## 4. Codebase Walkthrough 📂

Let's go through each file and understand its purpose.

### 4.1 Configuration Files

#### `package.json` - Dependencies
**Purpose:** Defines all npm packages needed for the project.

**Key Dependencies:**
```json
{
  "@mysten/dapp-kit": "^0.19.6",    // Wallet connection UI
  "@mysten/sui": "^1.43.1",         // Sui blockchain SDK
  "@shinami/clients": "^0.9.7",     // Shinami Gas Station SDK
  "@tanstack/react-query": "^5.90.5", // Data fetching
  "next": "15.5.6",                 // React framework
  "react": "19.1.0"                 // UI library
}
```

**Why these?**
- `@mysten/dapp-kit`: Provides `<ConnectButton>`, wallet hooks
- `@mysten/sui`: Core Sui functionality (transactions, clients)
- `@shinami/clients`: **Most important!** - Provides Gas Station integration
- `@tanstack/react-query`: Required by dApp Kit for caching

---

#### `.env.local` - Environment Variables
**Purpose:** Store sensitive API keys (never commit to git!)

**Required Variables:**
```bash
# Shinami API Keys (get from https://app.shinami.com)
SHINAMI_GAS_STATION_ACCESS_KEY=us1_sui_testnet_xxxxx
SHINAMI_NODE_ACCESS_KEY=us1_sui_testnet_xxxxx

# Network configuration
NEXT_PUBLIC_SUI_NETWORK=testnet

# Your deployed Move package
NEXT_PUBLIC_MOVE_PACKAGE_ID=0xYOUR_PACKAGE_ID
```

**Why separate keys?**
- **Gas Station Key**: Access to your gas fund (highly sensitive!)
- **Node Key**: RPC access (read blockchain data)
- Separation allows different permission levels

---

#### `lib/shinami-client.ts` - SDK Setup
**Purpose:** Initialize Shinami clients that other files will import.

```typescript
import { GasStationClient } from '@shinami/clients/sui';
import { SuiClient } from '@mysten/sui/client';

// Create Gas Station client (for sponsoring)
export const gasStationClient = new GasStationClient(
  process.env.SHINAMI_GAS_STATION_ACCESS_KEY
);

// Create Sui client (for reading/executing)
export const suiClient = new SuiClient({
  url: `https://api.us1.shinami.com/node/v1/${process.env.SHINAMI_NODE_ACCESS_KEY}`
});
```

**Why this file?**
- ✅ Centralized configuration (single source of truth)
- ✅ Validates API keys on startup
- ✅ Easy to import in API routes: `import { gasStationClient } from '@/lib/shinami-client'`

**Important:** These clients ONLY exist on the backend (Node.js). Never try to use them in frontend components!

---

#### `lib/types.ts` - TypeScript Interfaces
**Purpose:** Define data structures for type safety.

```typescript
// Request to build a sponsored transaction
export interface BuildSponsoredTxRequest {
  sender: string;      // User's wallet address
  num1?: number;       // Example: params for Move function
  num2?: number;
}

// Response with sponsored transaction
export interface BuildSponsoredTxResponse {
  txBytes: string;           // Serialized transaction
  sponsorSignature: string;  // Shinami's signature
  digest: string;            // Transaction hash
}
```

**Why TypeScript types?**
- 🛡️ Catch errors at compile time (not runtime!)
- 📝 Self-documenting code
- 🚀 Better IDE autocomplete

---

### 4.2 Backend API Routes

#### `app/api/buildSponsoredTx/route.ts` - Sponsor Move Calls
**Purpose:** Build and sponsor transactions that call Move functions.

**What it does:**
1. Receives sender address and function parameters
2. Builds a gasless transaction using `buildGaslessTransaction()`
3. Calls the Move module (e.g., `math::add`)
4. Sponsors via Shinami Gas Station
5. Returns sponsored transaction to frontend

**Flow:**
```
Frontend POST request
      ↓
Validate inputs
      ↓
buildGaslessTransaction((txb) => {
  txb.moveCall({ target: "0x...::math::add", ... })
})
      ↓
gasStationClient.sponsorTransaction(tx)
      ↓
Return { txBytes, sponsorSignature, digest }
```

**Why this approach?**
- ✅ Backend has access to `gasStationClient` (API keys secure)
- ✅ Transaction built with correct format for sponsorship
- ✅ Frontend just needs to sign and submit

---

#### `app/api/buildTransferTx/route.ts` - Sponsor Transfers
**Purpose:** Build and sponsor SUI transfer transactions.

**What it does:**
1. Receives sender, recipient, amount
2. Fetches sender's SUI coins from blockchain
3. Builds gasless transfer using sender's coins
4. Sponsors via Gas Station
5. Returns to frontend

**Critical Code:**
```typescript
// Get sender's coins first
const coins = await suiClient.getCoins({
  owner: sender,
  coinType: '0x2::sui::SUI'
});

// Build gasless transfer
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    // Split from sender's coin (NOT txb.gas!)
    const [coin] = txb.splitCoins(coins.data[0].coinObjectId, [amount]);
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);
```

**Why fetch coins first?**
- In gasless transactions, there's no `txb.gas` object yet
- Must use sender's existing coins for splits/transfers
- This is a common pattern in sponsored transactions

---

#### `app/api/executeSponsoredTx/route.ts` - Backend Execution
**Purpose:** Execute transaction on backend (alternative flow).

**What it does:**
1. Receives transaction bytes and BOTH signatures
2. Submits to Sui blockchain
3. Returns transaction result

**When to use:**
- When you want backend to handle final submission
- For better error handling/logging
- To hide blockchain RPC details from frontend

**Flow Comparison:**
```
Frontend Execution (Flow 1):
Backend → Sponsor → Frontend → Sign → Frontend → Execute

Backend Execution (Flow 2):
Backend → Sponsor → Frontend → Sign → Backend → Execute
```

---

### 4.3 Frontend Components

#### `components/Providers.tsx` - Setup Wrapper
**Purpose:** Configure all providers needed by the app.

**What it provides:**
```tsx
<QueryClientProvider>          // React Query (caching)
  <SuiClientProvider>          // Sui network connection
    <WalletProvider>           // Wallet connection
      {children}
    </WalletProvider>
  </SuiClientProvider>
</QueryClientProvider>
```

**Key Configuration:**
```typescript
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') }
});
```

**Why this matters:**
- `networkConfig`: Tells wallet which network to use
- `autoConnect: false`: User must click "Connect Wallet"
- React Query: Required by dApp Kit for wallet state management

---

#### `components/TransferForm.tsx` - Transfer UI
**Purpose:** UI for gas-free SUI transfers.

**User Flow:**
1. Enter recipient address
2. Enter amount in SUI
3. Click "Send SUI (Gas-Free)"
4. Sign in wallet popup
5. Transaction executes with sponsored gas!

**Key Implementation:**
```typescript
// Step 1: Request backend to sponsor
const buildResponse = await fetch('/api/buildTransferTx', {
  method: 'POST',
  body: JSON.stringify({ sender, recipient, amount })
});
const { txBytes, sponsorSignature } = await buildResponse.json();

// Step 2: User signs
const { signature: senderSignature } = await signTransaction({
  transaction: txBytes
});

// Step 3: Execute with BOTH signatures
await suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [senderSignature, sponsorSignature]
});
```

**Why separate form?**
- ♻️ Reusable component
- 📝 Clear separation of concerns
- 🎨 Easy to style independently

---

#### `app/page.tsx` - Main Demo Page
**Purpose:** Main application UI with two demos.

**Features:**
1. **Wallet Connection** - `<ConnectButton />` from dApp Kit
2. **Transfer Form** - Gas-free SUI transfers
3. **Math Demo** - Call Move functions with two flows:
   - Flow 1: Execute on frontend
   - Flow 2: Execute on backend

**Why two flows?**
- Shows flexibility of Gas Station integration
- Frontend execution = faster (one less API call)
- Backend execution = better control/logging

**Important Hooks:**
```typescript
const currentAccount = useCurrentAccount();     // Get connected wallet
const { mutateAsync: signTransaction } = useSignTransaction();  // Sign txs
const suiClient = useSuiClient();              // Blockchain client
```

---

### 4.4 Smart Contract

#### `move-example/sources/math.move` - Demo Module
**Purpose:** Simple Move module to demonstrate gasless function calls.

```move
module move_example::math {
    public entry fun add(a: u64, b: u64) {
        let result = a + b;
        event::emit(AdditionEvent { a, b, result });
    }
    
    public entry fun hello_world() {
        // Simple function for testing
    }
}
```

**Why this module?**
- 📚 Educational - shows Move basics
- 🎯 No complex dependencies
- ✅ Demonstrates that even simple functions benefit from gas sponsorship

---

## 5. Code Block-by-Block Explanations 🔍

### 5.1 The Most Important Pattern: `buildGaslessTransaction`

**❌ WRONG WAY (doesn't work):**
```typescript
const tx = new Transaction();
tx.moveCall({ ... });
const bytes = await tx.build({ client, onlyTransactionKind: true });
const txKind = toB64(bytes);
await gasStationClient.sponsorTransaction({ txKind, sender });
// ⚠️ This will fail with "Invalid params" error!
```

**✅ CORRECT WAY:**
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

**Why the difference?**
- `buildGaslessTransaction()` creates a special `GaslessTransaction` object
- This object has placeholders for the gas object (to be filled by sponsor)
- Manual building doesn't create the right structure

---

### 5.2 SUI Transfer Pattern

```typescript
// ❌ WRONG: Using txb.gas
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    const [coin] = txb.splitCoins(txb.gas, [amount]);  // ❌ txb.gas doesn't exist!
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);
```

```typescript
// ✅ CORRECT: Using sender's coins
const coins = await suiClient.getCoins({ owner: sender });

const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    const [coin] = txb.splitCoins(coins.data[0].coinObjectId, [amount]);
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);
```

**Why fetch coins first?**
- In normal transactions, `txb.gas` references the gas payment object
- In gasless transactions, there's no gas object yet (sponsor will provide it)
- Must use sender's actual owned coins

---

### 5.3 Sponsorship Pattern

```typescript
// Build the gasless transaction
const gaslessTx = await buildGaslessTransaction(
  (txb) => { /* your transaction logic */ },
  { sui: suiClient }
);

// Set sender address
gaslessTx.sender = sender;

// Optional: Set manual gas budget (or omit for auto-budgeting)
// gaslessTx.gasBudget = '10000000';

// Sponsor via Shinami Gas Station
const sponsoredResponse = await gasStationClient.sponsorTransaction(gaslessTx);

// sponsoredResponse contains:
// {
//   txBytes: '...',      // Serialized transaction ready to sign
//   signature: '...',    // Sponsor's signature
//   txDigest: '...'      // Transaction hash
// }
```

**Auto-budgeting vs Manual:**
- **Auto-budgeting** (recommended): Omit `gasBudget`, Shinami estimates
- **Manual**: Set `gaslessTx.gasBudget` if you know exact amount
- Auto-budgeting adds 5% buffer (25% for shared objects)

---

### 5.4 Signing Pattern

```typescript
// Frontend: Sign with connected wallet
const { signature: senderSignature } = await signTransaction({
  transaction: sponsoredTx.txBytes
});

// Wallet popup appears:
// ┌──────────────────────────────┐
// │  Approve Transaction         │
// │  ───────────────────────────│
// │  Function: math::add         │
// │  Gas: Sponsored ✅           │
// │                              │
// │  [Cancel]  [Approve]        │
// └──────────────────────────────┘
```

**What user sees:**
- Transaction details
- "Gas: Sponsored" indicator (if wallet supports it)
- No gas fee deduction!

---

### 5.5 Execution Pattern

```typescript
// Execute with BOTH signatures
const result = await suiClient.executeTransactionBlock({
  transactionBlock: sponsoredTx.txBytes,
  signature: [
    senderSignature,      // From wallet signing
    sponsoredTx.signature // From Gas Station
  ],
  options: {
    showEffects: true,
    showEvents: true,
    showObjectChanges: true
  }
});

console.log('Transaction digest:', result.digest);
console.log('Gas used:', result.effects.gasUsed);
```

**Important:** Order matters! `[senderSignature, sponsorSignature]`

---

### 5.6 Move Call Pattern

```typescript
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    txb.moveCall({
      target: `${packageId}::math::add`,
      arguments: [
        txb.pure.u64(10),
        txb.pure.u64(20)
      ]
    });
  },
  { sui: suiClient }
);
```

**Breaking it down:**
- `target`: `package_id::module_name::function_name`
- `arguments`: Array of transaction arguments
- `txb.pure.u64(10)`: Creates a pure argument of type u64
- Other types: `txb.pure.string()`, `txb.pure.address()`, etc.

---

## 6. Live Demo Flow 🎬

### Demo 1: Gas-Free Transfer (5 minutes)

**Setup:**
1. Open app at `localhost:3000`
2. Click "Connect Wallet"
3. Make sure on Testnet (check wallet)

**Demo Steps:**
```
1. Show wallet balance
   "I have 5 SUI in my wallet"

2. Fill transfer form
   Recipient: 0x[another address]
   Amount: 0.1 SUI

3. Click "Send SUI (Gas-Free)"
   → Backend builds transaction
   → Backend requests sponsorship from Shinami
   → Returns to frontend

4. Wallet popup appears
   → Click "Approve"
   → User signature created

5. Transaction executes
   ✅ Success message appears
   ✅ Check wallet: only 0.1 SUI deducted (not 0.101!)
   ✅ Check Suiscan: see two signatures
```

**Point to highlight:**
"Notice I only lost 0.1 SUI, not 0.1 + gas. Shinami paid the gas!"

---

### Demo 2: Math Function (5 minutes)

**Purpose:** Show you can call Move functions even with EMPTY wallet.

**Demo Steps:**
```
1. Enter two numbers
   Number 1: 42
   Number 2: 58

2. Click "Submit on Frontend"
   → Builds transaction on backend
   → Sponsors via Shinami
   → Returns to frontend
   → Sign with wallet
   → Execute on frontend

3. Check transaction on Suiscan
   → See AdditionEvent emitted
   → See two signatures (user + sponsor)

4. Try "Submit on Backend" flow
   → Same result, but backend handles execution
```

**Key teaching moment:**
"This Move call works even if your wallet is completely empty. Only need SUI when transferring actual assets."

---

### Demo 3: Shinami Dashboard (3 minutes)

**Show the Dashboard:**
1. Go to [app.shinami.com](https://app.shinami.com)
2. Navigate to Gas Station → Your Fund

**Point out:**
- Fund balance (how much SUI left)
- Completed transactions (your demos!)
- Cost per transaction (~0.001-0.01 SUI)
- Usage metrics

**Key message:**
"This is where you monitor your gas spending. Set up alerts for low balance!"

---

## 7. Common Pitfalls & Solutions 🚨

### Pitfall 1: "Invalid params" Error

**Symptom:**
```
Error: Invalid params (-32602)
```

**Cause:**
Not using `buildGaslessTransaction()` helper.

**Solution:**
```typescript
// ❌ Don't do this
const tx = new Transaction();
const bytes = await tx.build({ onlyTransactionKind: true });

// ✅ Do this
const gaslessTx = await buildGaslessTransaction(...);
```

---

### Pitfall 2: "realFetch.call is not a function"

**Symptom:**
```
TypeError: realFetch.call is not a function
```

**Cause:**
Shinami SDK not externalized in Next.js.

**Solution:**
Add to `next.config.ts`:
```typescript
serverExternalPackages: ['@shinami/clients']
```

---

### Pitfall 3: "Sender has no SUI coins"

**Symptom:**
```
Error: Sender has no SUI coins to transfer
```

**Cause:**
Wallet empty, trying to transfer SUI.

**Solution:**
1. Get testnet SUI from Discord faucet
2. Remember: Gas Station pays gas, not transfer amount!

**Clarification:**
```
Gas Station pays: GAS FEES
User must have: TRANSFER AMOUNT

Example: Transfer 0.1 SUI
- User needs: 0.1 SUI
- Shinami pays: 0.001 SUI (gas)
```

---

### Pitfall 4: Using `txb.gas` in Gasless Transactions

**Symptom:**
Transaction fails or builds incorrectly.

**Cause:**
```typescript
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    const [coin] = txb.splitCoins(txb.gas, [amount]);  // ❌ Wrong!
  },
  { sui: suiClient }
);
```

**Solution:**
```typescript
const coins = await suiClient.getCoins({ owner: sender });

const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    const [coin] = txb.splitCoins(coins.data[0].coinObjectId, [amount]);  // ✅ Correct!
  },
  { sui: suiClient }
);
```

---

### Pitfall 5: API Keys in Frontend

**Symptom:**
Exposed API keys in browser console/network tab.

**Cause:**
Importing `gasStationClient` in frontend components.

**Solution:**
- ✅ Backend only: API routes
- ❌ Never: Frontend components

```typescript
// ❌ WRONG - In frontend component
import { gasStationClient } from '@/lib/shinami-client';

// ✅ CORRECT - In API route
import { gasStationClient } from '@/lib/shinami-client';
```

---

### Pitfall 6: Wrong Signature Order

**Symptom:**
```
Error: Signature verification failed
```

**Cause:**
```typescript
signature: [sponsorSignature, senderSignature]  // ❌ Wrong order
```

**Solution:**
```typescript
signature: [senderSignature, sponsorSignature]  // ✅ Correct order
```

**Remember:** User first, sponsor second!

---

## Workshop Timeline ⏱️

**Suggested 1-hour breakdown:**

```
0:00-0:10 (10 min) - Introduction
  • What is a Gas Station?
  • Why gasless transactions matter
  • Real-world use cases

0:10-0:20 (10 min) - Technical Deep Dive
  • How sponsorship works (two signatures)
  • Transaction flow diagram
  • Key concepts (gasless tx, sponsorship)

0:20-0:30 (10 min) - Codebase Overview
  • Project structure walkthrough
  • File-by-file explanation
  • Architecture diagram

0:30-0:45 (15 min) - Live Coding Demo
  • Demo 1: Gas-free transfer
  • Demo 2: Move function call
  • Demo 3: Shinami dashboard

0:45-0:55 (10 min) - Common Pitfalls
  • Top 6 mistakes and solutions
  • Best practices
  • Production considerations

0:55-1:00 (5 min) - Q&A
  • Open floor for questions
  • Share resources and links
```

---

## Quick Reference Card 📋

**Essential Patterns:**

```typescript
// 1. Build Gasless Transaction
const gaslessTx = await buildGaslessTransaction(
  (txb) => { /* your tx logic */ },
  { sui: suiClient }
);
gaslessTx.sender = sender;

// 2. Sponsor Transaction
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);

// 3. Sign Transaction (frontend)
const { signature } = await signTransaction({
  transaction: sponsored.txBytes
});

// 4. Execute Transaction
await suiClient.executeTransactionBlock({
  transactionBlock: sponsored.txBytes,
  signature: [signature, sponsored.signature]
});
```

**Golden Rules:**
- ✅ Use `buildGaslessTransaction()`
- ✅ Never use `txb.gas` in gasless transactions
- ✅ Keep API keys on backend
- ✅ Execute with BOTH signatures
- ✅ Validate all inputs

---

## Resources 🔗

**Official Documentation:**
- [Shinami Docs](https://docs.shinami.com)
- [Shinami Dashboard](https://app.shinami.com)
- [Sui Documentation](https://docs.sui.io)
- [dApp Kit Docs](https://sdk.mystenlabs.com/dapp-kit)

**Code Examples:**
- [This Workshop Repo](https://github.com/[YOUR_REPO])
- [Shinami Examples](https://github.com/shinamicorp/shinami-examples)

**Community:**
- [Sui Discord](https://discord.gg/sui)
- [Shinami Support](mailto:support@shinami.com)

---

## Next Steps After Workshop 🚀

**For Attendees:**
1. Clone this repo and run locally
2. Deploy your own Move module
3. Integrate Gas Station into your dApp
4. Read Shinami docs for advanced features

**Advanced Topics (future workshops):**
- Rate limiting and abuse prevention
- Custom gas budgeting strategies
- Monitoring and alerting
- Multi-sponsor patterns
- Production deployment checklist

---

**End of Workshop Guide**

Good luck with your workshop! 🎉

