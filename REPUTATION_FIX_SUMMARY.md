# Reputation Score Update Fix Summary

## Issues Diagnosed

The reputation score was not updating on swap, add liquidity, and token creation operations due to several issues:

### 1. **Missing `amountOutMin` Parameter in Swap Function**
   - **Problem**: The `swapExactTokensForTokens` function in `TikTakDex.sol` requires 5 parameters including `amountOutMin`, but the frontend was calling it with only 4 parameters.
   - **Location**: `src/app/dex/page.tsx` - `handleSwap` function
   - **Impact**: Swaps would fail or behave incorrectly

### 2. **Manual Reputation Updates in Frontend**
   - **Problem**: The frontend was attempting to manually update reputation scores after swaps and liquidity additions, but regular users are not granted updater permissions in the Reputation contract.
   - **Location**: 
     - `src/app/dex/page.tsx` - swap and add liquidity handlers
     - `src/app/components/TokenSwap.tsx` - swap handler
   - **Impact**: These calls would fail silently, and reputation updates were not happening because the contract's automatic updates were also failing (see issue #3)

### 3. **Contracts Not Granted Updater Permissions**
   - **Problem**: The `TikTakDex` and `TokenFactory` contracts need to be granted updater permissions in the Reputation contract to call `updateScore`. If they're not granted, the on-chain reputation updates fail silently (caught in try/catch blocks).
   - **Impact**: Even though contracts have code to update reputation, they fail because they lack permissions

### 4. **Reputation Contract Not Set**
   - **Problem**: If `reputationContract` address is not set in `TikTakDex` or `TokenFactory`, the reputation update code returns early without doing anything.
   - **Impact**: No reputation updates occur

## Fixes Applied

### 1. Fixed Swap Function Call
   - ✅ Added `amountOutMin` parameter calculation with 0.5% slippage tolerance
   - ✅ Updated function signature in ABI to match contract
   - ✅ Removed manual reputation update attempts

### 2. Removed Manual Reputation Updates
   - ✅ Removed manual `updateScore` calls from swap handlers
   - ✅ Removed manual `updateScore` calls from add liquidity handler
   - ✅ Added comments explaining that reputation is updated automatically by contracts

### 3. Created Setup Scripts
   - ✅ Created `scripts/check-reputation-setup.js` - Diagnostic script to verify reputation configuration
   - ✅ Created `scripts/fix-reputation-setup.js` - Script to automatically fix reputation setup issues

### 4. Updated Documentation
   - ✅ Added comments in `useReputation.ts` explaining that `addPoints` only works for updaters/owners

## How to Fix Your Deployment

Run the following script to check and fix the reputation setup:

```bash
# First, check the current state
node scripts/check-reputation-setup.js

# Then, fix any issues
node scripts/fix-reputation-setup.js

# Verify the fix
node scripts/check-reputation-setup.js
```

## How Reputation Updates Work Now

1. **Swap**: When a user swaps tokens via `TikTakDex.swapExactTokensForTokens()`, the contract automatically calls `_awardReputation(user, 1, pairKey, "SWAP")` which updates the reputation score (+1 XP).

2. **Add Liquidity**: When a user adds liquidity via `TikTakDex.addLiquidity()`, the contract automatically calls `_awardReputation(user, 2, pairKey, "ADD_LIQ")` which updates the reputation score (+2 XP).

3. **Token Creation**: When a user creates a token via `TokenFactory.createToken()`, the contract automatically calls `IReputation(reputationContract).updateScore(msg.sender, 5)` which updates the reputation score (+5 XP).

All reputation updates happen **on-chain** and require:
- The contract (TikTakDex or TokenFactory) to have `reputationContract` address set
- The contract to be granted updater permissions in the Reputation contract

## Testing

After running the fix script, test the following:
1. Perform a swap - reputation should increase by +1
2. Add liquidity - reputation should increase by +2
3. Create a token - reputation should increase by +5

You can verify reputation scores using the `useReputation` hook or by calling `Reputation.getScore(userAddress)` directly.


