# Web3 Copilot 🚀

A comprehensive Web3 dashboard built with Next.js, featuring wallet connection, portfolio management, AI assistance, and token swapping capabilities.

## Features

- 🔗 **Wallet Connection**: Connect to MetaMask and switch to Polygon Amoy testnet
- 💼 **Portfolio Overview**: View your token balances with real-time USD values
- 🤖 **AI Assistant**: Chat with an AI that understands your portfolio and provides insights
- 🔄 **Token Swapping**: Swap tokens using Uniswap V2 on Polygon Amoy testnet
- 🎨 **Modern UI**: Neobrutalist design with smooth animations

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom neobrutalist design
- **Blockchain**: Ethers.js v5, MetaMask integration
- **AI**: Google Gemini API for portfolio assistance
- **Data**: Alchemy API for token balances, CoinGecko for prices

## Getting Started

### Prerequisites

- Node.js 18+ 
- MetaMask browser extension
- Alchemy API key
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd web3-copilot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Get your API keys:
- **Alchemy**: Sign up at [alchemy.com](https://www.alchemy.com/) and create a new app for Polygon Amoy testnet
- **Gemini**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Wallet Connection
1. Click "Connect Wallet" to connect your MetaMask
2. The app will automatically switch to Polygon Amoy testnet
3. Once connected, you'll see your wallet address and portfolio

### Portfolio Overview
- View your MATIC, WETH, DAI, and USDC balances
- See real-time USD values for each token
- Balances are fetched from the blockchain using Alchemy

### AI Assistant
- Ask questions about your portfolio
- Get insights and recommendations
- The AI understands your current holdings and can provide personalized advice

### Token Swapping
- Select tokens to swap from and to
- Enter the amount you want to swap
- Adjust slippage tolerance if needed
- Execute swaps directly through Uniswap V2

## Supported Networks

- **Polygon Amoy Testnet** (Chain ID: 80002)
- **Testnet Tokens**: WETH, DAI, USDC

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── Web3Copilot.tsx      # Main application component
│   │   ├── BackgroundAnimation.tsx
│   │   ├── PortfolioOverview.tsx
│   │   ├── AIAssistant.tsx
│   │   └── TokenSwap.tsx
│   ├── globals.css              # Global styles and animations
│   ├── layout.tsx
│   └── page.tsx
```

## Customization

### Adding New Tokens
To add support for new tokens, update the `TOKENS` object in `Web3Copilot.tsx`:

```typescript
const TOKENS = {
  'NEW_TOKEN': { 
    address: '0x...', 
    decimals: 18, 
    coingeckoId: 'token-id' 
  }
};
```

### Styling
The app uses a neobrutalist design system with custom CSS variables. Modify `globals.css` to change colors and animations.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub or contact the development team.
