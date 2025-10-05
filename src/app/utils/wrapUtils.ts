import { ethers } from 'ethers';

export interface WrapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface WrapParams {
  signer: ethers.JsonRpcSigner;
  amount: string;
  wrappedTokenAddress: string;
  wrappedTokenDecimals: number;
  isWrapping: boolean; // true for wrap, false for unwrap
}

/**
 * Wrap native token (ETH/MATIC) to wrapped token (WETH/WMATIC)
 */
export async function wrapToken(params: WrapParams): Promise<WrapResult> {
  const { signer, amount, wrappedTokenAddress, wrappedTokenDecimals, isWrapping } = params;
  
  try {
    const wrappedTokenContract = new ethers.Contract(
      wrappedTokenAddress,
      [
        'function deposit() public payable',
        'function withdraw(uint wad) public'
      ],
      signer
    );

    let tx;
    if (isWrapping) {
      // Wrap: deposit native token to get wrapped token
      const amountWei = ethers.parseEther(amount);
      tx = await wrappedTokenContract.deposit({ value: amountWei });
    } else {
      // Unwrap: withdraw wrapped token to get native token
      const amountWei = ethers.parseUnits(amount, wrappedTokenDecimals);
      tx = await wrappedTokenContract.withdraw(amountWei);
    }

    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash
    };
    } catch (error: unknown) {
    console.error('Wrap/Unwrap error:', error);
    
    const err = error as { code?: number | string; message?: string };
    
    // Handle specific error cases
    if (err.code === 4001 || err.message?.includes('User denied')) {
      return {
        success: false,
        error: 'Transaction cancelled by user'
      };
    }
    
    if (err.message?.includes('insufficient funds') || err.message?.includes('insufficient balance')) {
      return {
        success: false,
        error: 'Insufficient balance for this transaction'
      };
    }
    
    if (err.message?.includes('execution reverted')) {
      return {
        success: false,
        error: 'Transaction failed - insufficient liquidity or invalid amount'
      };
    }
    
    return {
      success: false,
      error: err.message || 'Unknown error occurred'
    };
  }
}

/**
 * Check if a transaction is a wrap/unwrap operation
 */
export function isWrapUnwrapOperation(fromToken: string, toToken: string, nativeSymbol: string, wrappedSymbol: string): boolean {
  return (
    (fromToken === nativeSymbol && toToken === wrappedSymbol) ||
    (fromToken === wrappedSymbol && toToken === nativeSymbol)
  );
}

/**
 * Get the wrapped token address for Polygon Amoy
 */
export function getWrappedTokenAddress(): string {
  return '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889'; // WMATIC on Amoy
}
