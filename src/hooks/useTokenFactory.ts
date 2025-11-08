import { ethers } from 'ethers';
import contracts from '../config/contracts.json';
import { REPUTATION_ABI, REPUTATION_ADDRESS } from "../constants/reputation";

const FACTORY_ABI = [
  'function createToken(string name,string symbol,uint256 initialSupply) external returns (address)',
  'event TokenCreated(address indexed tokenAddress,string name,string symbol,uint256 supply,address owner)'
];

export type CreatedToken = {
  address: string;
  name: string;
  symbol: string;
  supply: string;
};

export function useTokenFactory(signer: ethers.Signer | null) {
  const factory = signer && (contracts as any).tokenFactoryAddress
    ? new ethers.Contract((contracts as any).tokenFactoryAddress, FACTORY_ABI, signer)
    : null;

  const createToken = async (name: string, symbol: string, supply: string): Promise<CreatedToken | null> => {
    if (!factory) throw new Error('No signer connected or factory address missing');

    const supplyWei = ethers.parseUnits(supply, 18);
    
    // Estimate gas first with retry logic
    let gasEstimate: bigint = 2000000n; // Default fallback
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        gasEstimate = await factory.createToken.estimateGas(name, symbol, supplyWei);
        break; // Success
      } catch (gasError: any) {
        retryCount++;
        console.warn(`Gas estimation attempt ${retryCount} failed:`, gasError);
        
        if (retryCount >= maxRetries) {
          // If gas estimation fails, check for revert reason
          if (gasError.reason) {
            throw new Error(`Token creation would fail: ${gasError.reason}`);
          }
          if (gasError.data) {
            throw new Error('Token creation would fail. Please check your inputs.');
          }
          // Use default gas if estimation fails but no clear error
          gasEstimate = 2000000n; // Default for token creation (contract deployment)
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    // Execute transaction with proper gas settings
    let tx;
    try {
      tx = await factory.createToken(name, symbol, supplyWei, {
        gasLimit: gasEstimate + 50000n // Add buffer for contract deployment
      });
    } catch (txError: any) {
      console.error('Token creation transaction failed:', txError);
      
      // Provide better error messages
      if (txError.reason) {
        throw new Error(`Token creation failed: ${txError.reason}`);
      }
      if (txError.code === 'ACTION_REJECTED' || txError.code === 4001) {
        throw new Error('Transaction was rejected by user');
      }
      if (txError.message?.includes('Internal JSON-RPC error')) {
        throw new Error('RPC error occurred. Please try again or check your network connection.');
      }
      throw new Error(txError.message || 'Token creation failed. Please try again.');
    }
    
    const receipt = await tx.wait();

    // Reputation handled on-chain by TokenFactory

    // Parse TokenCreated event
    for (const log of receipt.logs) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === 'TokenCreated') {
          return {
            address: parsed.args.tokenAddress as string,
            name: parsed.args.name as string,
            symbol: parsed.args.symbol as string,
            supply: (parsed.args.supply as bigint).toString(),
          };
        }
      } catch {
        // ignore non-factory logs
      }
    }
    return null;
  };

  return { createToken };
}



