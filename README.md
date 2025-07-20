# Step-1 Vault

A Pure-On-Chain Automated Quantitative Finance Protocol built on Massa blockchain, leveraging Autonomous Smart Contracts (ASC) and DeWeb for a fully decentralized DeFi experience.

## Overview

Step-1 Vault is a self-running DeFi protocol that:
- Automatically rebalances portfolios based on on-chain price signals
- Operates without keepers or external triggers using Massa's ASC
- Hosts its frontend on DeWeb for unstoppable access
- Provides transparent, verifiable strategies entirely on-chain

## Key Features

- **Autonomous Operation**: Strategy execution via deferred calls - no manual intervention needed
- **On-Chain Price Oracle**: TWAP-based pricing resistant to manipulation
- **Automated Rebalancing**: Smart contracts self-execute based on market conditions
- **DeWeb Frontend**: Decentralized hosting ensures perpetual availability
- **Emergency Controls**: Pause functionality and emergency withdrawals for user protection

## Architecture

```
PriceOracle ← DEX price updates
    ↓
StrategyEngine (self-awakening via ASC)
    ↓
TradeExecutor → Rebalancing
    ↓
Vault → User deposits/withdrawals
```

## Quick Start

### Prerequisites

- Node.js 18+
- Massa wallet with testnet MAS
- Git

### Installation

```bash
git clone https://github.com/your-repo/step-1-vault
cd step-1-vault
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Add your private key and configure parameters

### Build Contracts

```bash
npm run build
```

### Deploy

```bash
npm run deploy:testnet
```

### Run Frontend Locally

```bash
cd front-end
npm install
npm run dev
```

### Deploy Frontend to DeWeb

```bash
cd front-end
npm run build
npx @massalabs/deweb-cli upload ./dist --node_url https://buildnet.massa.net/api/v2
```

## Smart Contracts

### Vault.ts
Core vault managing user deposits, withdrawals, and share accounting.

### PriceOracle.ts
Maintains TWAP price feed with manipulation resistance.

### StrategyEngine.ts
Autonomous strategy executor using deferred calls for self-awakening.

### TradeExecutor.ts
Handles actual trading operations and portfolio rebalancing.

### Governance.ts
Controls protocol parameters and emergency functions.

### SimpleDEX.ts (Dev Only)
Minimal AMM for testing price feeds during development.

## Testing

```bash
npm test
```

## Security

- Reentrancy protection on withdrawals
- TWAP window ≥ 10 minutes against flash loan attacks
- Whitelisted strategy-executor interactions
- Multi-sig governance actions
- Emergency pause and withdrawal mechanisms

## Deployment Addresses (Testnet)

After deployment, addresses are saved to `addresses.json`:
- Vault: `AS1...`
- Oracle: `AS1...`
- Strategy: `AS1...`
- Executor: `AS1...`
- Governance: `AS1...`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built for the AKINDO x Massa Buildathon Wave 1
