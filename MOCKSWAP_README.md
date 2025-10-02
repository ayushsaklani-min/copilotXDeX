# MockSwap DeFi Component

A comprehensive React component for interacting with the MockSwap smart contract using Ethers.js v6. This component provides a complete DeFi swap interface for exchanging TokenA (TKA) for TokenB (TKB).

## Features

### 🔌 Wallet Connection
- **Connect Wallet Button**: Easy MetaMask wallet connection
- **Connection Status**: Visual indication of wallet connection state
- **Auto-detection**: Automatically detects existing wallet connections

### 💰 Balance Display
- **Real-time Balances**: Shows current TKA and TKB balances
- **Auto-refresh**: Balances update after successful transactions
- **Formatted Display**: User-friendly balance formatting with 4 decimal places

### 📊 Contract Information
- **Exchange Rate**: Displays current swap rate from the MockSwap contract
- **Contract Addresses**: Shows truncated contract addresses for reference
- **Live Data**: Real-time fetching of contract state

### 🔄 Swap Functionality
- **Input Validation**: Validates swap amounts and checks sufficient balance
- **Two-step Process**: 
  1. **Approve**: Approve TokenA spending by MockSwap contract
  2. **Swap**: Execute the actual token swap
- **Smart Button States**: Buttons automatically enable/disable based on conditions
- **Allowance Tracking**: Shows current approval amount

### 🎨 User Interface
- **Neon Theme**: Consistent with the Web3 Copilot design system
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Visual feedback during transactions
- **Error Handling**: User-friendly error messages
- **Status Updates**: Real-time transaction status updates

## Contract Integration

### Contract Addresses
- **MockSwap**: `0x865ca22F1c5A91746cBcd0563F647ac203154403`
- **TokenA (TKA)**: `0x0555C0c9d8719a800acA5d111239d9c76Ec7A7eF`
- **TokenB (TKB)**: `0x8C8a706DE324A6283ac4844C2fAFc6A4406ba502`

### Supported Functions
- `balanceOf(address)` - Get token balances
- `approve(address, uint256)` - Approve token spending
- `allowance(address, address)` - Check approval amount
- `swapAforB(uint256)` - Execute token swap
- `rate()` - Get current exchange rate

## Usage

### Basic Integration
```tsx
import MockSwap from './components/MockSwap';

function App() {
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });

  return (
    <MockSwap
      isOpen={true}
      onToggle={() => {}}
      signer={signer}
      address={address}
      onStatusChange={setStatus}
    />
  );
}
```

### Props Interface
```tsx
interface MockSwapProps {
  isOpen: boolean;                    // Controls component visibility
  onToggle: () => void;              // Toggle collapse/expand
  signer: ethers.JsonRpcSigner | null; // Ethereum signer
  address: string | null;            // User wallet address
  onStatusChange: (status: {         // Status callback
    message: string; 
    type: string;
  }) => void;
}
```

## Demo Page

A standalone demo page is available at `/mockswap-demo` that showcases the component with:
- Wallet connection interface
- Contract address display
- Usage instructions
- Complete swap workflow

## Technical Implementation

### State Management
- **React Hooks**: Uses useState and useEffect for state management
- **Real-time Updates**: Automatically refreshes data after transactions
- **Error Boundaries**: Comprehensive error handling and user feedback

### Smart Contract Interaction
- **Ethers.js v6**: Latest version for optimal performance
- **Parallel Calls**: Efficiently fetches multiple contract values simultaneously
- **Gas Optimization**: Minimal gas usage with optimized contract calls

### Security Features
- **Input Validation**: Validates all user inputs before transactions
- **Balance Checks**: Ensures sufficient balance before swap attempts
- **Allowance Verification**: Checks approval amounts before swaps
- **Error Recovery**: Graceful handling of failed transactions

## Workflow

### Complete Swap Process
1. **Connect Wallet**: User connects MetaMask wallet
2. **View Balances**: Component displays current TKA and TKB balances
3. **Enter Amount**: User inputs desired swap amount
4. **Check Rate**: System shows expected TKB output based on current rate
5. **Approve Tokens**: User approves TKA spending (if needed)
6. **Execute Swap**: User confirms and executes the swap
7. **Update Balances**: Component refreshes to show new balances

### Button States
- **Connect Wallet**: Shown when wallet not connected
- **Approve**: Shown when allowance is insufficient
- **Swap**: Enabled when all conditions are met
- **Loading States**: Shown during transaction processing

## Error Handling

### Common Scenarios
- **Wallet Not Connected**: Clear instructions to connect wallet
- **Insufficient Balance**: Prevents swap with helpful message
- **Insufficient Allowance**: Prompts user to approve more tokens
- **Transaction Rejected**: User-friendly message for cancelled transactions
- **Network Errors**: Retry mechanisms and error recovery

## Styling

The component uses the Web3 Copilot design system with:
- **Neon Theme**: Cyan and purple color scheme
- **Glass Morphism**: Semi-transparent backgrounds with blur effects
- **Responsive Layout**: Adapts to different screen sizes
- **Smooth Animations**: Hover effects and transitions

## Dependencies

- **React**: ^19.1.0
- **Ethers.js**: ^6.15.0
- **TypeScript**: ^5
- **Tailwind CSS**: ^4

## Browser Compatibility

- **MetaMask**: Full support for MetaMask wallet
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: Responsive design works on mobile browsers
- **Web3 Wallets**: Compatible with MetaMask mobile app

This component provides a complete, production-ready interface for DeFi token swapping with comprehensive error handling, security features, and an intuitive user experience.
