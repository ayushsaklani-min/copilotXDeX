# 🏛️ NFT-Based Governance System

Complete on-chain governance system for TikTakDex protocol decisions.

## 📋 Overview

The governance system allows Diamond (500+ XP) and Crystal (1000+ XP) tier users to:
- Mint NFT governance badges
- Create proposals for protocol changes
- Vote on proposals with tier-based voting power
- Execute successful proposals

## 🎯 Features

### Badge System
- **Diamond Badge**: 500+ XP → 2x voting power
- **Crystal Badge**: 1000+ XP → 3x voting power
- Automatic badge minting when tier is reached
- Badge upgrades when tier increases

### Proposal System
- **Fee Changes**: Modify trading fees
- **Add Pools**: Create new trading pairs
- **Update Rewards**: Change farming reward rates
- **Parameter Changes**: Other protocol parameters

### Voting System
- 7-day voting period
- Quorum threshold: 100 votes minimum
- Tier-based voting power multipliers
- On-chain vote tracking

## 🚀 Deployment

### Step 1: Deploy Contracts

```bash
npx hardhat run scripts/deploy-governance.js --network polygon-amoy
```

This will:
1. Deploy `GovernanceBadge.sol` (NFT contract)
2. Deploy `Governance.sol` (main governance contract)
3. Update `contracts.json` with new addresses
4. Save deployment info to `governance-deployment.json`

### Step 2: Verify Contracts

After deployment, verify on PolygonScan:
```bash
npx hardhat verify --network polygon-amoy <BADGE_ADDRESS> <REPUTATION_ADDRESS> <OWNER_ADDRESS>
npx hardhat verify --network polygon-amoy <GOVERNANCE_ADDRESS> <BADGE_ADDRESS> <DEX_ADDRESS> <OWNER_ADDRESS>
```

## 💻 Usage

### For Users

1. **Check Badge Eligibility**
   - Navigate to `/governance`
   - If you have 500+ XP, click "Check & Mint Badge"
   - Badge will be minted automatically

2. **View Proposals**
   - Go to "Active Proposals" tab
   - See all active proposals with voting status
   - View vote counts and time remaining

3. **Vote on Proposals**
   - Click "Vote For" or "Vote Against"
   - Your voting power (2x or 3x) will be applied
   - Transaction confirms your vote on-chain

4. **Create Proposals**
   - Go to "Create Proposal" tab
   - Fill in proposal details:
     - Type (Fee Change, Add Pool, etc.)
     - Title and description
     - Target contract address
     - Calldata (encoded function call)
   - Submit proposal (requires badge)

5. **Execute Proposals**
   - After voting ends and proposal succeeds
   - Click "Execute Proposal" on your proposals
   - Proposal executes automatically

### For Developers

#### Creating a Proposal

```typescript
// Example: Propose fee change
const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);

// Encode the function call
const iface = new ethers.Interface(DEX_ABI);
const calldata = iface.encodeFunctionData("setFeeRate", [25]); // 0.25%

// Create proposal
const tx = await governance.createProposal(
  0, // FEE_CHANGE
  "Reduce fees to 0.25%",
  "This proposal reduces trading fees from 0.3% to 0.25%",
  dexAddress,
  calldata
);
```

#### Voting

```typescript
// Vote for proposal
await governance.vote(proposalId, true); // true = for, false = against

// Check if user voted
const hasVoted = await governance.userHasVoted(proposalId, userAddress);

// Get user's vote
const [support, votes] = await governance.getUserVote(proposalId, userAddress);
```

## 📊 Contract Addresses

After deployment, addresses are saved in:
- `src/config/contracts.json` → `badgeAddress` and `governanceAddress`
- `governance-deployment.json` → Full deployment details

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Only badge holders can vote/create proposals
- **Quorum Requirement**: Minimum votes needed for proposals to pass
- **Execution Delay**: 1-day delay after voting ends before execution
- **Status Tracking**: Clear proposal status (Active, Succeeded, Defeated, Executed)

## 🎨 UI Features

- Beautiful gradient design matching DEX theme
- Real-time proposal updates
- Badge status display
- Voting power visualization
- Proposal history tracking
- Mobile-responsive design

## 📝 Proposal Lifecycle

1. **Creation**: Badge holder creates proposal
2. **Active**: 7-day voting period begins
3. **Voting**: Badge holders vote (For/Against)
4. **Finalization**: After voting ends, status updates
5. **Execution**: If succeeded, anyone can execute
6. **Executed**: Changes applied to protocol

## 🔧 Configuration

### Voting Period
Default: 7 days (can be modified in contract)

### Quorum Threshold
Default: 100 votes minimum (can be modified in contract)

### Execution Delay
Default: 1 day after voting ends (can be modified in contract)

## 🐛 Troubleshooting

### "Must have governance badge" error
- Ensure you have 500+ XP (Diamond) or 1000+ XP (Crystal)
- Click "Check & Mint Badge" to mint your badge

### "Proposal not active" error
- Voting period may have ended
- Check proposal status in UI

### "Execution delay not met" error
- Wait 1 day after voting ends before executing

## 📚 Contract Interfaces

### GovernanceBadge
- `checkAndMintBadge(address)` - Mint/upgrade badge
- `getBadgeInfo(address)` - Get badge details
- `getVotingPower(uint256)` - Get voting power for token
- `hasValidBadge(address)` - Check if user has badge

### Governance
- `createProposal(...)` - Create new proposal
- `vote(uint256, bool)` - Vote on proposal
- `executeProposal(uint256)` - Execute succeeded proposal
- `getProposal(uint256)` - Get proposal details
- `userHasVoted(uint256, address)` - Check if user voted

## 🎉 Success!

Your governance system is now fully integrated and ready to use!

Visit `/governance` to start participating in protocol decisions.


