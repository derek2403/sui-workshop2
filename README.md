# Shinami Gas Station + Next.js Integration 🚀

> A complete example of integrating Shinami Gas Station for gas-free transactions on Sui with connected wallet signing.

## 🎯 What This Is

A **production-ready** Next.js application that lets users send transactions on Sui **without paying gas fees**. Your Shinami Gas Station fund covers the gas costs while users sign transactions with their connected wallets.

## ✨ Features

- 💸 **Gas-free SUI transfers** - Send SUI without paying gas
- 🎮 **Sponsored Move calls** - Execute smart contracts gas-free
- 👛 **Connected wallet signing** - Users sign with Sui Wallet, Ethos, etc.
- ⚡ **Two submission flows** - Frontend or backend transaction execution
- 🎨 **Beautiful UI** - Modern, responsive design with dark mode
- 🔒 **Secure** - API keys safely stored on backend

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
SHINAMI_GAS_STATION_ACCESS_KEY=us1_sui_testnet_YOUR_KEY
SHINAMI_NODE_ACCESS_KEY=us1_sui_testnet_YOUR_KEY
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_MOVE_PACKAGE_ID=0xYOUR_PACKAGE_ID
```

Get API keys from [Shinami Dashboard](https://app.shinami.com)

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 4. Connect Wallet & Test

1. Connect your Sui wallet (must be on Testnet)
2. Get testnet SUI from [Discord faucet](https://discord.gg/sui)
3. Try transferring SUI or running the math demo
4. ✅ Gas paid by Shinami!

## 📚 Documentation

- **[Complete Setup Guide](./COMPLETE_SETUP_GUIDE.md)** - Comprehensive documentation
- **[Shinami Docs](https://docs.shinami.com)** - Official Shinami documentation
- **[Sui dApp Kit](https://sdk.mystenlabs.com/dapp-kit)** - Wallet connection library

## 🏗️ Architecture

```
Frontend (Next.js + React)
    ↓ Request sponsorship
Backend API Routes
    ↓ Build gasless tx
    ↓ Sponsor via Shinami
    ↑ Return sponsored tx
Frontend
    ↓ User signs
    ↓ Execute with both signatures
Sui Blockchain ✅
```

## 🔑 Key Concepts

### Gas Station vs User Wallet

- **Gas Station** → Pays GAS FEES (~0.001 SUI per tx)
- **User Wallet** → Provides TRANSACTION CONTENT (SUI to transfer, etc.)

### Example: 0.1 SUI Transfer

```
Transfer amount: 0.1 SUI    ← From user's wallet
Gas fee:         0.002 SUI  ← From Gas Station (Shinami)
Total cost:      0.1 SUI    ← User saves 0.002 SUI!
```

## 📁 Project Structure

```
├── app/
│   ├── api/               # Backend API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main UI
├── components/
│   ├── Providers.tsx      # Wallet & React Query
│   └── TransferForm.tsx   # Transfer UI
├── lib/
│   ├── shinami-client.ts  # Shinami config
│   └── types.ts           # TypeScript types
├── move-example/          # Example Move contract
└── .env.local            # Environment config
```

## 🧪 Testing

Check if transaction is sponsored on [Suiscan](https://suiscan.xyz/testnet):

**Indicators:**
- ✅ Two signatures (User + Sponsor)
- ✅ Gas Object Owner ≠ Sender
- ✅ "Sponsor Signature" field exists

## 🛠️ Technologies

- **Next.js 15** - React framework
- **Shinami SDK** - Gas Station & Node Service
- **Sui dApp Kit** - Wallet connection
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## 📝 Important Code Patterns

### ✅ Correct Way (Use Shinami Helper)

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

### ❌ Wrong Way (Manual Building)

```typescript
// Don't do this!
const tx = new Transaction();
const txBytes = await tx.build({ onlyTransactionKind: true });
const txKind = toB64(txBytes);
// This won't work correctly
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Sender has no SUI coins" | Get testnet SUI from faucet |
| "Invalid params" | Use `buildGaslessTransaction` |
| "Failed to parse URL" | Check Shinami URL format |
| Fetch errors | Ensure `serverExternalPackages` in config |

## 🌟 Production Checklist

- [ ] Add API authentication
- [ ] Implement rate limiting
- [ ] Set up monitoring
- [ ] Configure alerts for low fund balance
- [ ] Add comprehensive error handling
- [ ] Write tests
- [ ] Use Mainnet keys

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available for educational purposes.

## 🔗 Links

- [Shinami Website](https://www.shinami.com)
- [Shinami Dashboard](https://app.shinami.com)
- [Sui Documentation](https://docs.sui.io)
- [Example Code](https://github.com/shinamicorp/shinami-examples)

---

**Built with ❤️ using Shinami Gas Station**

Questions? Check the [Complete Setup Guide](./COMPLETE_SETUP_GUIDE.md) or reach out to [Shinami Support](mailto:support@shinami.com)
