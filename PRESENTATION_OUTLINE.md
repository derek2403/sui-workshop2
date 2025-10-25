# Gasless Transactions Workshop - Presentation Outline 🎤

## Slide-by-Slide Guide for 1-Hour Workshop

---

### SLIDE 1: Title (1 min)
**Title:** "Gasless Transactions on Sui with Shinami Gas Station"

**Say:**
> "Today we'll learn how to remove one of the biggest barriers in Web3: gas fees. By the end, you'll know how to build dApps where users don't need native tokens to get started."

---

### SLIDE 2: The Problem (2 min)
**Visual:** Show user flow hitting a wall

```
User visits your dApp
    ↓
Wants to try a feature
    ↓
"You need 0.001 SUI for gas" ❌
    ↓
User leaves frustrated
```

**Say:**
> "Imagine downloading a mobile app, and before you can even try it, they ask you to buy in-app currency. That's what requiring gas fees feels like to new users."

**Real stats:**
- 70%+ of users drop off when asked to get native tokens first
- Poor onboarding is the #1 complaint in Web3 UX

---

### SLIDE 3: The Solution - Gas Station (3 min)
**Visual:** Side-by-side comparison

```
WITHOUT Gas Station          WITH Gas Station
┌──────────────────┐        ┌──────────────────┐
│ User pays:       │        │ User pays:       │
│ • Transfer: 0.1  │        │ • Transfer: 0.1  │
│ • Gas: 0.001     │        │                  │
│ Total: 0.101 SUI │        │ Total: 0.1 SUI   │
└──────────────────┘        └──────────────────┘
                            ┌──────────────────┐
                            │ App pays:        │
                            │ • Gas: 0.001     │
                            └──────────────────┘
```

**Say:**
> "A Gas Station is a service that pays gas fees on behalf of your users. Your app covers the tiny gas costs (~$0.001 per tx), users get a seamless experience."

**Key Point:** Gas Station pays GAS, user still needs SUI for actual transfers.

---

### SLIDE 4: How It Works - The Magic of Two Signatures (4 min)
**Visual:** Transaction flow with two signatures

```
┌─────────────┐
│    USER     │ Signs: "I approve this transaction content"
└─────────────┘
       +
┌─────────────┐
│   SPONSOR   │ Signs: "I'll pay the gas for this"
└─────────────┘
       ↓
Both signatures sent to blockchain
       ↓
    SUCCESS! ✅
```

**Say:**
> "The breakthrough is dual signatures. The user signs to approve what the transaction does. The sponsor signs to pay for the gas. Both are required."

**Code Example (show on screen):**
```typescript
suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [userSignature, sponsorSignature]  // Both!
});
```

---

### SLIDE 5: Complete Transaction Flow (5 min)
**Visual:** Step-by-step diagram

```
1️⃣ Frontend → Backend
   "Please sponsor this transaction"
   (sends: user address, transaction params)

2️⃣ Backend → Shinami Gas Station
   "Here's a transaction to sponsor"
   (sends: gasless transaction object)

3️⃣ Shinami → Backend
   "Here's the sponsored transaction"
   (returns: txBytes + sponsor signature)

4️⃣ Backend → Frontend
   "Ready for user to sign"
   (returns: txBytes + sponsor signature)

5️⃣ Frontend → User's Wallet
   "Please sign this transaction"
   (wallet popup appears)

6️⃣ User → Frontend
   "Here's my signature"
   (user approves in wallet)

7️⃣ Frontend → Sui Blockchain
   "Execute with both signatures"
   (sends: txBytes + both signatures)

8️⃣ Blockchain validates both ✅
   Transaction succeeds!
```

**Say:**
> "Let's walk through the complete flow. The key insight is that the backend coordinates with Shinami to get the sponsor signature before the user even sees the transaction."

---

### SLIDE 6: Project Architecture (3 min)
**Visual:** Three-layer diagram

```
┌────────────────────────────────────┐
│         FRONTEND LAYER             │
│  • React UI (page.tsx)             │
│  • Wallet Connection (Providers)   │
│  • User Signs Transactions         │
└─────────────────┬──────────────────┘
                  │ HTTP API
┌─────────────────▼──────────────────┐
│         BACKEND LAYER              │
│  • API Routes (buildSponsoredTx)   │
│  • Shinami SDK Integration         │
│  • Transaction Building            │
└─────────────────┬──────────────────┘
                  │ Shinami API
┌─────────────────▼──────────────────┐
│      EXTERNAL SERVICES             │
│  • Shinami Gas Station             │
│  • Shinami Node Service            │
│  • Sui Blockchain                  │
└────────────────────────────────────┘
```

**Say:**
> "The architecture is clean: frontend handles UI and user signing, backend handles the sensitive Gas Station API, and Shinami bridges to the blockchain."

---

### SLIDE 7: File Structure Overview (3 min)
**Visual:** File tree with annotations

```
sui-workshop2/
├── 🎨 FRONTEND
│   ├── app/page.tsx           ← Main UI
│   └── components/
│       ├── Providers.tsx      ← Wallet setup
│       └── TransferForm.tsx   ← Transfer UI
│
├── ⚙️ BACKEND API
│   └── app/api/
│       ├── buildSponsoredTx/  ← Sponsor Move calls
│       ├── buildTransferTx/   ← Sponsor transfers
│       └── executeSponsoredTx/← Backend execution
│
├── 🔧 CONFIG
│   └── lib/
│       ├── shinami-client.ts  ← SDK setup ⭐
│       └── types.ts           ← TypeScript types
│
└── 📦 SMART CONTRACT
    └── move-example/
        └── math.move          ← Demo module
```

**Say:**
> "Everything is organized by responsibility. The most important file is `shinami-client.ts` - it initializes the Gas Station client."

---

### SLIDE 8: Code Deep Dive #1 - Shinami Client Setup (3 min)
**Visual:** Code with annotations

```typescript
// lib/shinami-client.ts

import { GasStationClient } from '@shinami/clients/sui';
import { SuiClient } from '@mysten/sui/client';

// Initialize Gas Station client
export const gasStationClient = new GasStationClient(
  process.env.SHINAMI_GAS_STATION_ACCESS_KEY  // 🔑 Secret key!
);

// Initialize Sui client (for reading/executing)
export const suiClient = new SuiClient({
  url: `https://api.us1.shinami.com/node/v1/${process.env.SHINAMI_NODE_ACCESS_KEY}`
});
```

**Key Points:**
- ✅ Runs ONLY on backend (Node.js)
- ✅ API keys from environment variables
- ✅ Single source of truth for all API routes

**Say:**
> "This is the foundation. These two clients are imported by all our API routes. Never try to use these in frontend - API keys must stay secret!"

---

### SLIDE 9: Code Deep Dive #2 - The Critical Pattern (5 min)
**Visual:** Side-by-side comparison

```typescript
// ❌ WRONG (doesn't work)
const tx = new Transaction();
tx.moveCall({ ... });
const bytes = await tx.build({ 
  client, 
  onlyTransactionKind: true 
});
await gasStationClient.sponsorTransaction({ 
  txKind: toB64(bytes), 
  sender 
});
// Result: "Invalid params" error ❌
```

```typescript
// ✅ CORRECT (works!)
import { buildGaslessTransaction } from '@shinami/clients/sui';

const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    txb.moveCall({ ... });
  },
  { sui: suiClient }
);
gaslessTx.sender = sender;
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);
// Result: Success! ✅
```

**Say:**
> "This is THE most important pattern. Always use `buildGaslessTransaction()` from the Shinami SDK. Don't try to build transactions manually - it won't work."

**Why?**
- Creates proper `GaslessTransaction` object
- Has placeholders for gas object (to be filled by sponsor)
- Correctly formatted for Shinami's API

---

### SLIDE 10: Code Deep Dive #3 - Building Sponsored Transactions (4 min)
**Visual:** Code from `app/api/buildSponsoredTx/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { sender, num1, num2 } = await request.json();
  
  // Step 1: Build gasless transaction
  const gaslessTx = await buildGaslessTransaction(
    (txb) => {
      txb.moveCall({
        target: `${packageId}::math::add`,
        arguments: [
          txb.pure.u64(num1),
          txb.pure.u64(num2)
        ]
      });
    },
    { sui: suiClient }
  );
  
  // Step 2: Set sender
  gaslessTx.sender = sender;
  
  // Step 3: Sponsor via Shinami
  const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);
  
  // Step 4: Return to frontend
  return NextResponse.json({
    txBytes: sponsored.txBytes,
    sponsorSignature: sponsored.signature,
    digest: sponsored.txDigest
  });
}
```

**Say:**
> "This is a complete API route for sponsoring Move function calls. Three steps: build, set sender, sponsor. Then return everything to the frontend."

---

### SLIDE 11: Code Deep Dive #4 - SUI Transfers (4 min)
**Visual:** Code from `app/api/buildTransferTx/route.ts`

```typescript
// Step 1: Fetch sender's coins
const coins = await suiClient.getCoins({
  owner: sender,
  coinType: '0x2::sui::SUI'
});

// Step 2: Build gasless transfer
const gaslessTx = await buildGaslessTransaction(
  (txb) => {
    // Use sender's coin, NOT txb.gas!
    const [coin] = txb.splitCoins(
      coins.data[0].coinObjectId,  // ← Sender's coin
      [amount]
    );
    txb.transferObjects([coin], recipient);
  },
  { sui: suiClient }
);

// Step 3: Sponsor
gaslessTx.sender = sender;
const sponsored = await gasStationClient.sponsorTransaction(gaslessTx);
```

**Key Point:**
```typescript
// ❌ WRONG
txb.splitCoins(txb.gas, [amount])  // txb.gas doesn't exist in gasless tx!

// ✅ CORRECT
txb.splitCoins(coins.data[0].coinObjectId, [amount])  // Use sender's coin
```

**Say:**
> "For transfers, you must fetch the sender's coins first. You can't use `txb.gas` because that gas object doesn't exist yet - the sponsor will provide it!"

---

### SLIDE 12: Code Deep Dive #5 - Frontend Signing & Execution (3 min)
**Visual:** Code from `components/TransferForm.tsx`

```typescript
// Step 1: Request sponsorship from backend
const buildResponse = await fetch('/api/buildTransferTx', {
  method: 'POST',
  body: JSON.stringify({ sender, recipient, amount })
});
const { txBytes, sponsorSignature } = await buildResponse.json();

// Step 2: User signs with wallet
const { signature: senderSignature } = await signTransaction({
  transaction: txBytes
});

// Step 3: Execute with BOTH signatures
await suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [senderSignature, sponsorSignature]  // Order matters!
});
```

**Say:**
> "Frontend flow: request backend to sponsor, user signs, execute with both signatures. Simple!"

---

### 🎬 LIVE DEMO TIME (15 min)

### DEMO 1: Connect Wallet (2 min)
**Show:**
1. Open `localhost:3000`
2. Click "Connect Wallet"
3. Approve connection
4. Show connected address

**Say:**
> "First, we connect. This uses Sui dApp Kit, which supports all major Sui wallets."

---

### DEMO 2: Gas-Free Transfer (5 min)
**Show:**
1. Check wallet balance (e.g., "I have 5 SUI")
2. Fill transfer form:
   - Recipient: `0x...` (another address)
   - Amount: `0.1`
3. Click "Send SUI (Gas-Free)"
4. Approve in wallet popup
5. Show success message
6. Check wallet balance again: "Now I have 4.9 SUI"
7. Open transaction on Suiscan, point out:
   - Two signatures ✅
   - Gas object owner ≠ sender ✅
   - "Sponsor Signature" field ✅

**Say:**
> "Notice I only paid 0.1 SUI. In a normal transaction, I'd pay 0.1 + 0.001 for gas. Shinami covered that 0.001!"

---

### DEMO 3: Math Function Call (5 min)
**Show:**
1. Enter numbers: `42` and `58`
2. Click "Submit on Frontend"
3. Approve in wallet
4. Show success
5. Open transaction on Suiscan:
   - See `AdditionEvent` emitted
   - See two signatures

**Say:**
> "This Move function call would normally require gas. But with Gas Station, it's free for the user. This is perfect for things like claiming rewards, voting, or social interactions."

**Bonus:** Try with empty wallet if you have one
> "Watch this - even with an empty wallet, I can call this function because I'm not transferring any assets!"

---

### DEMO 4: Shinami Dashboard (3 min)
**Show:**
1. Open [app.shinami.com](https://app.shinami.com)
2. Navigate to Gas Station → Your Fund
3. Point out:
   - Fund balance
   - Recent transactions (your demos!)
   - Cost per transaction
   - Usage graph

**Say:**
> "This is where you monitor your gas spending. For production, you'd set up alerts when balance gets low, and enable auto-refill."

---

### SLIDE 13: Common Pitfalls - Top 6 Mistakes (8 min)

#### Mistake #1: Not using `buildGaslessTransaction()`
```typescript
// ❌ Manual building
const tx = new Transaction();
// Result: "Invalid params" error
```
**Fix:** Always use `buildGaslessTransaction()`

---

#### Mistake #2: Using `txb.gas` in gasless transactions
```typescript
// ❌ Wrong
txb.splitCoins(txb.gas, [amount])
```
**Fix:** Use sender's coins instead

---

#### Mistake #3: Missing Next.js config
```
TypeError: realFetch.call is not a function
```
**Fix:** Add to `next.config.ts`:
```typescript
serverExternalPackages: ['@shinami/clients']
```

---

#### Mistake #4: Empty wallet for transfers
```
Error: Sender has no SUI coins
```
**Clarification:**
- Gas Station pays: **GAS FEES**
- User must have: **TRANSFER AMOUNT**

---

#### Mistake #5: Exposing API keys in frontend
```typescript
// ❌ NEVER do this in a React component
import { gasStationClient } from '@/lib/shinami-client';
```
**Fix:** Only import in backend API routes

---

#### Mistake #6: Wrong signature order
```typescript
// ❌ Wrong
signature: [sponsorSignature, senderSignature]

// ✅ Correct
signature: [senderSignature, sponsorSignature]
```
**Remember:** User first, sponsor second!

---

### SLIDE 14: Production Checklist (3 min)
**Visual:** Checklist

```
Before Going Live:
□ Rate limiting on API routes
□ Input validation and sanitization
□ User authentication/authorization
□ Monitoring and alerting (fund balance!)
□ Error handling and logging
□ Set spending limits per user
□ Use mainnet API keys
□ Test with real users
```

**Say:**
> "Don't skip security! In production, add rate limiting so users can't drain your fund. Set up monitoring so you know when balance is low."

---

### SLIDE 15: Best Practices (2 min)

**✅ DO:**
- Keep API keys on backend only
- Use auto-budgeting (let Shinami estimate gas)
- Validate all user inputs
- Set up fund balance alerts
- Log all sponsorship requests
- Test thoroughly on testnet first

**❌ DON'T:**
- Expose Gas Station keys to frontend
- Use `txb.gas` in gasless transactions
- Skip rate limiting in production
- Forget to monitor your fund balance
- Assume users understand "gasless" (explain it!)

---

### SLIDE 16: Resources (1 min)

**Documentation:**
- [Shinami Docs](https://docs.shinami.com) - Official documentation
- [Shinami Dashboard](https://app.shinami.com) - Manage funds
- [Sui Docs](https://docs.sui.io) - Blockchain documentation
- [dApp Kit](https://sdk.mystenlabs.com/dapp-kit) - Wallet integration

**Code:**
- This workshop repo (share link!)
- [Shinami Examples](https://github.com/shinamicorp/shinami-examples)

**Community:**
- [Sui Discord](https://discord.gg/sui) - Get help
- Shinami Support: support@shinami.com

---

### SLIDE 17: Q&A (5 min)

**Common Questions:**

**Q: How much does it cost?**
A: ~0.001-0.01 SUI per transaction (~$0.001-0.01 at current prices)

**Q: Can I sponsor transactions selectively?**
A: Yes! Add logic in your API route to decide which requests to sponsor

**Q: What prevents abuse?**
A: Implement rate limiting, user authentication, and spending caps

**Q: Can I use this on mainnet?**
A: Yes! Just create a mainnet fund and use mainnet API keys

**Q: Does the user know it's sponsored?**
A: Depends on the wallet, but you should communicate it in your UI

---

### SLIDE 18: Next Steps (2 min)

**For You:**
1. Clone this repo
2. Run locally and experiment
3. Deploy your own Move module
4. Integrate into your dApp
5. Share what you build!

**Advanced Topics (future learning):**
- Custom gas budgeting strategies
- Multi-sponsor patterns
- Analytics and monitoring
- Complex transaction types
- Smart contract patterns for sponsored txs

---

### SLIDE 19: Thank You! (1 min)

**Final Message:**
> "You now know how to eliminate gas fees as a barrier in your dApp. Go build amazing user experiences!"

**Stay Connected:**
- Workshop repo: [your-github-link]
- Twitter: [your-handle]
- Discord: [your-username]

---

## Timing Checklist ⏱️

- [ ] 0:00-0:10 - Slides 1-3 (Problem & Solution)
- [ ] 0:10-0:20 - Slides 4-6 (Technical Overview)
- [ ] 0:20-0:30 - Slides 7-8 (Architecture & Setup)
- [ ] 0:30-0:45 - Slides 9-12 + Demos (Code & Live Demo)
- [ ] 0:45-0:55 - Slides 13-15 (Pitfalls & Best Practices)
- [ ] 0:55-1:00 - Slides 16-19 (Resources & Q&A)

**Total: 60 minutes** ✅

---

## Presenter Notes 📝

### Energy & Pacing
- Start with energy! The problem is relatable - hook them
- Slow down for technical deep dives (Slides 9-12)
- Speed up for demos - show, don't just tell
- Save energy for Q&A - most learning happens here

### Visual Aids
- Use diagrams heavily (Slides 4-6)
- Color-code: Red for wrong, Green for correct
- Animate the flow diagram if possible
- Show actual code on screen, not just slides

### Engagement Tips
- Ask: "How many have hit this problem?"
- Poll: "Who has used a gas station before?"
- Invite questions during demos
- Share screen for live coding

### Backup Plans
- Pre-record demo videos (in case wifi fails)
- Have screenshots of Shinami dashboard
- Print code snippets as handouts
- Save local copy of all docs

---

Good luck with your workshop! 🚀

