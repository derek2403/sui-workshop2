# Your Codebase Explained - File by File 📚

## Overview

This codebase is a **complete, production-ready example** of integrating Shinami Gas Station for gasless transactions on Sui. It's designed to be educational - each file demonstrates a specific concept clearly.

---

## 🎯 What Problem Does This Solve?

**The Problem:**
New users need native tokens (SUI) before they can even TRY your dApp. This creates massive friction:
- Download wallet → Get tokens → Configure network → THEN try your app
- Result: 70%+ users drop off

**Your Solution:**
With this codebase, users can interact with your dApp **without owning any SUI for gas**. Your Gas Station fund covers those tiny fees.

---

## 📂 File-by-File Breakdown

### Configuration Layer 🔧

#### 1. `package.json` - Project Dependencies
**What it does:** Lists all the npm packages your project needs.

**Key packages:**
```json
{
  "@shinami/clients": "^0.9.7",     // ⭐ THE STAR - Gas Station SDK
  "@mysten/sui": "^1.43.1",         // Sui blockchain SDK
  "@mysten/dapp-kit": "^0.19.6",    // Wallet connection UI
  "@tanstack/react-query": "^5.90.5", // Data fetching (required by dApp Kit)
  "next": "15.5.6",                 // React framework
  "react": "19.1.0"                 // UI library
}
```

**Why these specific packages?**
- **@shinami/clients**: This is THE package that makes gasless transactions possible. It provides `GasStationClient` and `buildGaslessTransaction()`.
- **@mysten/sui**: Official Sui SDK for building transactions, reading blockchain data.
- **@mysten/dapp-kit**: Pre-built React components for wallet connection (`<ConnectButton />`, hooks).
- **@tanstack/react-query**: Required by dApp Kit for state management and caching.
- **Next.js**: Full-stack React framework (gives us both frontend AND backend in one project).

**Important:** This is a Next.js App Router project (see the `app/` directory), not Pages Router.

---

#### 2. `next.config.ts` - Next.js Configuration
**What it does:** Configures how Next.js builds and runs your app.

**Critical part:**
```typescript
serverExternalPackages: ['@shinami/clients']
```

**Why this matters:**
- By default, Next.js tries to bundle all npm packages
- Shinami SDK uses Node.js-specific features (like native fetch)
- `serverExternalPackages` tells Next.js: "Don't bundle this, use it directly from node_modules"
- **Without this:** You get `realFetch.call is not a function` errors

**Think of it as:** "Hey Next.js, treat Shinami SDK as a server-only package, don't try to make it work in the browser."

---

#### 3. `.env.local` - Environment Variables
**What it does:** Stores sensitive configuration (API keys, network settings).

**Contents:**
```bash
SHINAMI_GAS_STATION_ACCESS_KEY=us1_sui_testnet_xxxxx
SHINAMI_NODE_ACCESS_KEY=us1_sui_testnet_xxxxx
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_MOVE_PACKAGE_ID=0xYOUR_PACKAGE_ID
```

**Breaking it down:**

**SHINAMI_GAS_STATION_ACCESS_KEY** (secret)
- Access to your Gas Station fund
- Used to sponsor transactions
- **NEVER** expose to frontend
- Get from [app.shinami.com](https://app.shinami.com)

**SHINAMI_NODE_ACCESS_KEY** (secret)
- Access to Shinami's RPC nodes
- Used to read blockchain data and execute transactions
- Also backend-only

**NEXT_PUBLIC_SUI_NETWORK** (public)
- `testnet` or `mainnet`
- `NEXT_PUBLIC_` prefix means it's exposed to frontend (safe)
- Tells wallet which network to use

**NEXT_PUBLIC_MOVE_PACKAGE_ID** (public)
- Your deployed Move package address
- Used to call Move functions like `math::add`
- Deploy your Move code first, then set this

**Why separate keys?**
- Separation of concerns: Gas Station vs Node Service
- Different permission levels
- Can rotate keys independently
- Better security (principle of least privilege)

---

#### 4. `lib/shinami-client.ts` - SDK Initialization ⭐
**What it does:** The HEART of the backend - initializes Shinami clients that all API routes use.

**Full code:**
```typescript
import { GasStationClient } from '@shinami/clients/sui';
import { SuiClient } from '@mysten/sui/client';

// Validate environment variables
if (!process.env.SHINAMI_GAS_STATION_ACCESS_KEY) {
  throw new Error('SHINAMI_GAS_STATION_ACCESS_KEY is not set');
}
if (!process.env.SHINAMI_NODE_ACCESS_KEY) {
  throw new Error('SHINAMI_NODE_ACCESS_KEY is not set');
}

const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

// Gas Station client - for sponsoring transactions
export const gasStationClient = new GasStationClient(
  process.env.SHINAMI_GAS_STATION_ACCESS_KEY
);

// Sui client - for reading/executing transactions
export const suiClient = new SuiClient({
  url: `https://api.us1.shinami.com/node/v1/${process.env.SHINAMI_NODE_ACCESS_KEY}`
});
```

**Breaking it down:**

**Validation block:**
- Checks if API keys exist on startup
- Fails fast with clear error message
- Better than cryptic errors later

**gasStationClient:**
- Created from Shinami SDK
- Has ONE job: sponsor transactions
- Main method: `sponsorTransaction(gaslessTx)`
- Takes a `GaslessTransaction`, returns sponsored bytes + signature

**suiClient:**
- Standard Sui client from Mysten Labs
- But pointed at Shinami's RPC (not public RPC)
- Shinami RPC is faster, more reliable, and you get dedicated support
- URL format: `https://api.us1.shinami.com/node/v1/YOUR_KEY`
- Note: API key is PART OF THE URL (unique to Shinami)

**Why this file exists:**
- ✅ Single source of truth (don't create clients everywhere)
- ✅ Validates config on startup
- ✅ Easy to import: `import { gasStationClient } from '@/lib/shinami-client'`
- ✅ If you need to change Shinami config, change it once here

**Critical:** These clients exist ONLY on backend (Node.js server). They're imported by API routes, never by React components.

---

#### 5. `lib/types.ts` - TypeScript Interfaces
**What it does:** Defines the "shape" of data flowing between frontend and backend.

**Key types:**

```typescript
// What frontend SENDS to backend
interface BuildSponsoredTxRequest {
  sender: string;      // Wallet address
  num1?: number;       // Example params
  num2?: number;
}

// What backend RETURNS to frontend
interface BuildSponsoredTxResponse {
  txBytes: string;           // Serialized transaction (ready to sign)
  sponsorSignature: string;  // Shinami's signature
  digest: string;            // Transaction hash
}

// For backend execution flow
interface ExecuteSponsoredTxRequest {
  txBytes: string;
  sponsorSignature: string;
  senderSignature: string;   // From wallet
}

interface ExecuteSponsoredTxResponse {
  digest: string;
  effects: any;
}
```

**Why TypeScript types matter:**
- 🛡️ Type safety: Catch bugs at compile time
- 📝 Self-documenting: Types explain the API contract
- 🚀 IDE autocomplete: Better developer experience
- 🔄 Refactoring confidence: Compiler catches breaking changes

**Think of types as:** The "contract" between frontend and backend. Frontend says "I'll send you this shape of data", backend says "I'll return you this shape of data".

---

### Backend API Layer ⚙️

#### 6. `app/api/buildSponsoredTx/route.ts` - Sponsor Move Calls
**What it does:** API endpoint that builds and sponsors transactions calling Move functions.

**Flow:**
```
Frontend request → Validate → Build gasless tx → Sponsor → Return
```

**Code breakdown:**

**Step 1: Receive and validate**
```typescript
export async function POST(request: NextRequest) {
  const body: BuildSponsoredTxRequest = await request.json();
  const { sender, num1, num2 } = body;

  if (!sender) {
    return NextResponse.json(
      { error: 'Sender address is required' },
      { status: 400 }
    );
  }
```
- Extracts sender address and parameters
- Validates required fields
- Returns 400 error if validation fails

**Step 2: Build gasless transaction**
```typescript
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
    }
  },
  { sui: suiClient }
);
```
- Uses `buildGaslessTransaction()` helper from Shinami SDK
- Takes a callback function that builds the transaction
- `txb` is a `TransactionBlock` instance
- `moveCall()` specifies which Move function to call
- `txb.pure.u64()` creates typed arguments

**Why this pattern?**
- Creates a special `GaslessTransaction` object (not a regular transaction)
- Has placeholders for gas object (to be filled by sponsor)
- Correct format for Shinami's sponsorship API

**Step 3: Set sender**
```typescript
gaslessTx.sender = sender;
```
- Assigns the user's wallet address as sender
- Required before sponsorship

**Step 4: Sponsor via Shinami**
```typescript
const sponsoredResponse = await gasStationClient.sponsorTransaction(gaslessTx);
```
- Sends transaction to Shinami Gas Station
- Shinami:
  1. Adds a gas object from your fund
  2. Signs with sponsor key
  3. Returns sponsored transaction bytes + signature

**Step 5: Return to frontend**
```typescript
return NextResponse.json({
  txBytes: sponsoredResponse.txBytes,
  sponsorSignature: sponsoredResponse.signature,
  digest: sponsoredResponse.txDigest,
});
```
- Frontend now has everything needed except user's signature

**Why this API route exists:**
- ✅ Backend has access to Gas Station API key (frontend doesn't)
- ✅ Centralized transaction building logic
- ✅ Can add validation, logging, rate limiting here
- ✅ Frontend stays simple - just sign and execute

**Use cases:**
- Calling any Move function without gas
- Voting, claiming rewards, social actions
- Minting NFTs, staking, unstaking
- Any blockchain interaction!

---

#### 7. `app/api/buildTransferTx/route.ts` - Sponsor Transfers
**What it does:** Specialized endpoint for sponsoring SUI transfers (a very common operation).

**What makes transfers special:**
In gasless transactions, you CAN'T use `txb.gas`. You must use sender's actual coins.

**Code breakdown:**

**Step 1: Validate inputs**
```typescript
const { sender, recipient, amount } = body;

if (!sender || !recipient) {
  return NextResponse.json({ error: 'Missing address' }, { status: 400 });
}
```

**Step 2: Fetch sender's coins**
```typescript
const coins = await suiClient.getCoins({
  owner: sender,
  coinType: '0x2::sui::SUI',
});

if (!coins.data || coins.data.length === 0) {
  return NextResponse.json(
    { error: 'Sender has no SUI coins to transfer' },
    { status: 400 }
  );
}
```
- Queries blockchain for sender's SUI coins
- `0x2::sui::SUI` is the type ID for SUI tokens
- Fails if sender has no coins

**Why fetch coins?**
In normal transactions:
```typescript
const [coin] = txb.splitCoins(txb.gas, [amount]);  // Use gas payment coin
```

In gasless transactions:
```typescript
// txb.gas doesn't exist yet! Must use sender's coins:
const [coin] = txb.splitCoins(coins.data[0].coinObjectId, [amount]);
```

**Step 3: Build gasless transfer**
```typescript
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    // Split from sender's coin (NOT txb.gas!)
    const [coin] = txb.splitCoins(senderCoin.coinObjectId, [amount]);
    
    // Transfer to recipient
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);
```
- `splitCoins()`: Creates a new coin with specified amount
- `transferObjects()`: Sends coin to recipient
- Uses sender's existing coin, not gas coin

**Step 4: Sponsor and return**
```typescript
gaslessTx.sender = sender;
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);

return NextResponse.json({
  txBytes: sponsored.txBytes,
  sponsorSignature: sponsored.signature,
  digest: sponsored.txDigest,
});
```

**Why separate endpoint for transfers?**
- ✅ Common operation deserves dedicated endpoint
- ✅ Different validation logic (need to check coins)
- ✅ Clear separation of concerns
- ✅ Easier to add transfer-specific features (limits, logging)

**Important clarification:**
```
Gas Station pays: GAS FEES (~0.001 SUI)
User must have: TRANSFER AMOUNT (e.g., 0.1 SUI)

Example: Transfer 0.1 SUI
- User needs in wallet: 0.1 SUI
- Shinami pays: 0.001 SUI (gas)
- User's wallet after: -0.1 SUI (NOT -0.101!)
```

---

#### 8. `app/api/executeSponsoredTx/route.ts` - Backend Execution
**What it does:** Optional endpoint for executing transactions on the backend (instead of frontend).

**Two execution flows:**

**Flow 1: Frontend Execution**
```
Backend builds & sponsors → Frontend signs → Frontend executes
```

**Flow 2: Backend Execution (this route)**
```
Backend builds & sponsors → Frontend signs → Backend executes
```

**Code:**
```typescript
export async function POST(request: NextRequest) {
  const { txBytes, sponsorSignature, senderSignature } = await request.json();

  // Execute with both signatures
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: [senderSignature, sponsorSignature],
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return NextResponse.json({
    digest: result.digest,
    effects: result.effects,
  });
}
```

**When to use Flow 2 (backend execution)?**
- ✅ Want centralized logging of all transactions
- ✅ Need to do post-execution processing
- ✅ Better error handling and retries
- ✅ Hide blockchain RPC details from frontend

**When to use Flow 1 (frontend execution)?**
- ✅ Faster (one less API call)
- ✅ User sees transaction status immediately
- ✅ Simpler architecture
- ✅ Frontend can use wallet's built-in transaction monitoring

**Think of it as:** Flow 1 is like ordering food online and picking it up yourself. Flow 2 is like having it delivered. Both work, different use cases.

---

### Frontend Layer 🎨

#### 9. `components/Providers.tsx` - Setup Wrapper
**What it does:** Sets up all the "context providers" that the rest of your app needs.

**React Context Pattern:**
Providers wrap your app and make functionality available to all components below them.

**The three providers:**

**1. QueryClientProvider (React Query)**
```typescript
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
}));
```
- Required by dApp Kit
- Manages caching and refetching of blockchain data
- Config: Retry once on failure, don't refetch when tab regains focus

**2. SuiClientProvider (dApp Kit)**
```typescript
const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

<SuiClientProvider networks={networkConfig} defaultNetwork={network}>
```
- Provides Sui blockchain client to components
- Configures which networks are available
- Sets default network (testnet or mainnet)
- Uses Mysten's public RPC (not Shinami, because this is frontend)

**3. WalletProvider (dApp Kit)**
```typescript
<WalletProvider autoConnect={false}>
```
- Manages wallet connection state
- Provides hooks like `useCurrentAccount()`, `useSignTransaction()`
- `autoConnect: false`: User must click "Connect Wallet" button
- Detects installed wallets (Sui Wallet, Ethos, Suiet, etc.)

**The nesting:**
```tsx
<QueryClientProvider>
  <SuiClientProvider>
    <WalletProvider>
      {children}  {/* Your app goes here */}
    </WalletProvider>
  </SuiClientProvider>
</QueryClientProvider>
```

**Why this matters:**
- ✅ Separates setup from application logic
- ✅ Only needs to be done once (in `layout.tsx`)
- ✅ All components can use wallet and blockchain features

**Important:** This is used in `app/layout.tsx` to wrap your entire app.

---

#### 10. `app/layout.tsx` - Root Layout
**What it does:** The "wrapper" for your entire app. Every page gets wrapped by this.

**Key parts:**
```typescript
import { Providers } from '@/components/Providers';
import '@mysten/dapp-kit/dist/index.css';  // Wallet UI styles

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}  {/* Your pages render here */}
        </Providers>
      </body>
    </html>
  );
}
```

**Why this file?**
- Next.js App Router requires a root layout
- Imports global styles
- Wraps with `<Providers>` so all pages have wallet functionality
- Only renders once (not on every navigation)

**Think of it as:** The "skeleton" of your app that never changes.

---

#### 11. `components/TransferForm.tsx` - Transfer UI Component
**What it does:** A reusable form for transferring SUI with gas sponsorship.

**Props:**
```typescript
interface TransferFormProps {
  senderAddress: string;  // Connected wallet address
}
```

**Component structure:**

**State management:**
```typescript
const [recipient, setRecipient] = useState<string>('');
const [amount, setAmount] = useState<string>('0.1');
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<string>('');
const [error, setError] = useState<string>('');
```

**Main function:**
```typescript
const handleTransfer = async () => {
  // 1. Validate inputs
  if (!recipient) {
    setError('Please enter a recipient address');
    return;
  }

  // 2. Convert SUI to MIST
  const amountInMist = Math.floor(amountNum * 1_000_000_000);

  // 3. Request backend to build and sponsor
  const buildResponse = await fetch('/api/buildTransferTx', {
    method: 'POST',
    body: JSON.stringify({
      sender: senderAddress,
      recipient: recipient.trim(),
      amount: amountInMist,
    }),
  });
  const sponsoredTx = await buildResponse.json();

  // 4. User signs with wallet
  const { signature: senderSignature } = await signTransaction({
    transaction: sponsoredTx.txBytes,
  });

  // 5. Execute with both signatures
  const executeResult = await suiClient.executeTransactionBlock({
    transactionBlock: sponsoredTx.txBytes,
    signature: [senderSignature, sponsoredTx.sponsorSignature],
  });

  // 6. Show success message
  setResult(`Transfer successful! Digest: ${executeResult.digest}`);
};
```

**UI elements:**
```tsx
// Recipient address input
<input
  type="text"
  value={recipient}
  onChange={(e) => setRecipient(e.target.value)}
  placeholder="0x..."
/>

// Amount input
<input
  type="number"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
/>

// Submit button
<button
  onClick={handleTransfer}
  disabled={loading || !recipient || !amount}
>
  {loading ? 'Processing...' : 'Send SUI (Gas-Free)'}
</button>

// Result/error display
{result && <div className="success">{result}</div>}
{error && <div className="error">{error}</div>}
```

**Why this component exists:**
- ✅ Reusable (can be used on multiple pages)
- ✅ Clean separation of concerns
- ✅ Handles all transfer logic in one place
- ✅ Good UX (loading states, error handling, validation)

**Unit conversion:**
```typescript
// SUI → MIST conversion
1 SUI = 1,000,000,000 MIST

// In code:
const amountInMist = parseFloat(amount) * 1_000_000_000;
```

**Why MIST?**
- Sui blockchain works in smallest unit (like Ethereum's wei)
- Prevents floating point errors
- Standard in Sui SDK

---

#### 12. `app/page.tsx` - Main Application Page
**What it does:** The main UI with all demo features.

**Features:**
1. Wallet connection button
2. Transfer form
3. Math demo (Move function call)
4. Two execution flows

**Key hooks:**
```typescript
const currentAccount = useCurrentAccount();  // Get connected wallet
const { mutateAsync: signTransaction } = useSignTransaction();  // Sign function
const suiClient = useSuiClient();  // Blockchain client
```

**Conditional rendering:**
```typescript
{currentAccount ? (
  // Show app UI
  <div>
    <TransferForm senderAddress={currentAccount.address} />
    {/* Math demo */}
  </div>
) : (
  // Show "Connect Wallet" prompt
  <div>Please connect your wallet</div>
)}
```

**Flow 1: Frontend Submit**
```typescript
const handleFrontendSubmit = async () => {
  // Build & sponsor on backend
  const buildResponse = await fetch('/api/buildSponsoredTx', {
    method: 'POST',
    body: JSON.stringify({ sender, num1, num2 }),
  });
  const sponsoredTx = await buildResponse.json();

  // Sign on frontend
  const { signature } = await signTransaction({
    transaction: sponsoredTx.txBytes
  });

  // Execute on frontend
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: sponsoredTx.txBytes,
    signature: [signature, sponsoredTx.sponsorSignature]
  });

  setResult(`Success! ${result.digest}`);
};
```

**Flow 2: Backend Submit**
```typescript
const handleBackendSubmit = async () => {
  // Build & sponsor on backend (same as Flow 1)
  const buildResponse = await fetch('/api/buildSponsoredTx', {...});
  const sponsoredTx = await buildResponse.json();

  // Sign on frontend (same as Flow 1)
  const { signature } = await signTransaction({...});

  // Execute on backend (different!)
  const executeResponse = await fetch('/api/executeSponsoredTx', {
    method: 'POST',
    body: JSON.stringify({
      txBytes: sponsoredTx.txBytes,
      sponsorSignature: sponsoredTx.sponsorSignature,
      senderSignature: signature,
    }),
  });
  const result = await executeResponse.json();

  setResult(`Success! ${result.digest}`);
};
```

**Why two flows?**
- Educational: Shows you have options
- Flow 1: Faster, simpler
- Flow 2: More control, better for production

**The math demo:**
```tsx
<input
  type="number"
  value={num1}
  onChange={(e) => setNum1(e.target.value)}
/>
<input
  type="number"
  value={num2}
  onChange={(e) => setNum2(e.target.value)}
/>

<button onClick={handleFrontendSubmit}>
  Submit on Frontend (Flow 1)
</button>

<button onClick={handleBackendSubmit}>
  Submit on Backend (Flow 2)
</button>
```

**Purpose of math demo:**
- Simple Move call (no transfers)
- Works even with empty wallet!
- Shows gasless transactions aren't just for transfers
- Educational: Can see AdditionEvent in blockchain explorer

---

### Smart Contract Layer 📦

#### 13. `move-example/sources/math.move` - Demo Move Module
**What it does:** Simple Move smart contract with math operations.

**Full code:**
```move
module move_example::math {
    use sui::event;

    // Event emitted when add() is called
    public struct AdditionEvent has copy, drop {
        a: u64,
        b: u64,
        result: u64,
    }

    // Event emitted when multiply() is called
    public struct MultiplicationEvent has copy, drop {
        a: u64,
        b: u64,
        result: u64,
    }

    // Public entry function: adds two numbers
    public entry fun add(a: u64, b: u64) {
        let result = a + b;
        event::emit(AdditionEvent { a, b, result });
    }

    // Public entry function: multiplies two numbers
    public entry fun multiply(a: u64, b: u64) {
        let result = a * b;
        event::emit(MultiplicationEvent { a, b, result });
    }

    // Public entry function: does nothing (for connectivity testing)
    public entry fun hello_world() {
        // No-op function
    }
}
```

**Breaking it down:**

**Module declaration:**
```move
module move_example::math {
```
- Module name: `math`
- Package: `move_example` (from Move.toml)
- Called as: `PACKAGE_ID::math::add`

**Event structs:**
```move
public struct AdditionEvent has copy, drop {
    a: u64,
    b: u64,
    result: u64,
}
```
- `public struct`: Can be seen by other modules
- `has copy, drop`: Abilities (can be copied, can be discarded)
- Fields: `a`, `b`, `result` (all 64-bit unsigned integers)

**Entry functions:**
```move
public entry fun add(a: u64, b: u64) {
    let result = a + b;
    event::emit(AdditionEvent { a, b, result });
}
```
- `public`: Can be called from other modules
- `entry`: Can be called from transactions (externally)
- Takes two `u64` parameters
- Emits event with calculation

**Why events?**
- Permanent log on blockchain
- Can be queried by frontend
- Proof that calculation happened
- Visible in blockchain explorers

**hello_world function:**
```move
public entry fun hello_world() {
    // No-op
}
```
- Does nothing
- Used for testing connectivity
- Simplest possible sponsored transaction

**Purpose of this module:**
- ✅ Educational: Shows Move basics
- ✅ Simple: No complex dependencies
- ✅ Safe: Can't lose assets
- ✅ Demonstrates events
- ✅ Perfect for gas sponsorship demo

**How to deploy:**
```bash
cd move-example
sui client publish --gas-budget 100000000
```
Copy the package ID to your `.env.local`.

---

## 🔄 Complete Transaction Flow

Let's trace a complete transaction through the entire codebase:

**Scenario:** User wants to call `math::add(10, 20)`

### Step 1: User Interaction (Frontend)
```
📱 app/page.tsx
User enters: num1 = 10, num2 = 20
User clicks: "Submit on Frontend"
```

### Step 2: Request Sponsorship (Frontend → Backend)
```
📱 app/page.tsx → fetch('/api/buildSponsoredTx')

POST /api/buildSponsoredTx
Body: {
  sender: "0xUSER_ADDRESS",
  num1: 10,
  num2: 20
}
```

### Step 3: Build Gasless Transaction (Backend)
```
⚙️ app/api/buildSponsoredTx/route.ts

1. Import clients from lib/shinami-client.ts
2. buildGaslessTransaction((txb) => {
     txb.moveCall({
       target: "PACKAGE_ID::math::add",
       arguments: [txb.pure.u64(10), txb.pure.u64(20)]
     })
   })
3. Result: GaslessTransaction object
```

### Step 4: Sponsor Transaction (Backend → Shinami)
```
⚙️ app/api/buildSponsoredTx/route.ts

gaslessTx.sender = "0xUSER_ADDRESS"
sponsored = await gasStationClient.sponsorTransaction(gaslessTx)

→ Sends to Shinami API
→ Shinami adds gas object from your fund
→ Shinami signs with sponsor key
→ Returns: { txBytes, signature, txDigest }
```

### Step 5: Return to Frontend (Backend → Frontend)
```
⚙️ route.ts → 📱 page.tsx

Response: {
  txBytes: "AACCDxxx...",
  sponsorSignature: "ABz123...",
  digest: "7Hy9..."
}
```

### Step 6: User Signs (Frontend)
```
📱 app/page.tsx

const { signature } = await signTransaction({
  transaction: sponsoredTx.txBytes
})

→ Wallet popup appears
→ User clicks "Approve"
→ Wallet creates signature
→ Returns: "USER_SIGNATURE_HERE"
```

### Step 7: Execute Transaction (Frontend → Blockchain)
```
📱 app/page.tsx

await suiClient.executeTransactionBlock({
  transactionBlock: sponsoredTx.txBytes,
  signature: [
    "USER_SIGNATURE",      // From Step 6
    sponsoredTx.signature  // From Step 5
  ]
})

→ Sends to Sui blockchain
→ Blockchain validates BOTH signatures
→ Executes transaction
→ Calls math::add(10, 20)
```

### Step 8: Move Execution (Blockchain)
```
📦 move-example/sources/math.move

public entry fun add(a: u64, b: u64) {
    let result = a + b;  // 10 + 20 = 30
    event::emit(AdditionEvent { a: 10, b: 20, result: 30 });
}

→ Event emitted
→ Transaction finalized
```

### Step 9: Success (Frontend)
```
📱 app/page.tsx

setResult(`Transaction successful! Digest: 7Hy9...`)

→ User sees success message
→ Can view on Suiscan
→ Two signatures visible ✅
```

---

## 🎯 Why Each Component Exists

### Why `lib/shinami-client.ts`?
Without it: Every API route would create its own clients, duplicate validation, inconsistent config.
With it: Single source of truth, consistent behavior, easy to maintain.

### Why separate API routes?
Without: One giant route handling all transaction types, messy code.
With: Clear separation, easy to add new transaction types, better for scaling.

### Why `buildGaslessTransaction()`?
Without: Manual transaction building doesn't create correct format, sponsorship fails.
With: Creates proper `GaslessTransaction` object, works with Shinami API.

### Why fetch coins before transfer?
Without: Can't use `txb.gas` in gasless transactions (doesn't exist yet).
With: Uses sender's real coins, transaction works correctly.

### Why two execution flows?
Without: Only one way to do it, less educational.
With: Shows flexibility, lets you choose based on your needs.

### Why TypeScript types?
Without: Runtime errors, unclear API contracts, hard to refactor.
With: Compile-time safety, self-documenting, better DX.

### Why Providers component?
Without: Setup code repeated in every page.
With: Setup once, use everywhere, cleaner code.

### Why separate TransferForm?
Without: Transfer logic mixed with main page, hard to reuse.
With: Reusable component, clean separation, easier to test.

### Why math.move module?
Without: No smart contract to demonstrate sponsorship with.
With: Simple, safe way to show gasless transactions work for any Move call.

---

## 🎓 Key Takeaways for Your Workshop

### 1. The Core Pattern
```typescript
// Backend
const gaslessTx = await buildGaslessTransaction(...);
gaslessTx.sender = sender;
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);
return { txBytes, sponsorSignature };

// Frontend
const { signature } = await signTransaction({ transaction: txBytes });
await suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [signature, sponsorSignature]
});
```

### 2. The Golden Rules
- ✅ Always use `buildGaslessTransaction()`
- ✅ Never use `txb.gas` in gasless transactions
- ✅ Keep API keys on backend only
- ✅ Execute with both signatures: `[userSig, sponsorSig]`

### 3. The Mental Model
```
Gas Station = Your app's "gas credit card"
User = Provides transaction content
Shinami = Pays the gas bill
Blockchain = Validates both approved
```

### 4. The Cost Reality
- Gas costs: ~$0.001 per transaction
- User experience value: PRICELESS
- 1 SUI = ~1,000 sponsored transactions
- Small investment, huge UX improvement

---

## 📚 What to Emphasize in Your Workshop

### For Beginners:
- Focus on `app/page.tsx` and `components/TransferForm.tsx`
- Show the demo running
- Explain "two signatures" concept clearly
- Demo the Shinami dashboard

### For Intermediate:
- Deep dive into API routes
- Explain `buildGaslessTransaction()` pattern
- Show the difference between Flow 1 and Flow 2
- Discuss production considerations

### For Advanced:
- Explain why `txb.gas` doesn't work
- Discuss `GaslessTransaction` object structure
- Talk about rate limiting and security
- Advanced patterns (multi-sponsor, conditional sponsorship)

---

**That's your entire codebase, explained!** 🎉

Each file plays a specific role in making gasless transactions work smoothly. Together, they create a complete, production-ready example that's also highly educational.

For your workshop, start with the big picture (what problem we're solving), then zoom into the code, then zoom back out to show it working. Good luck! 🚀

