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
    const tx = await factory.createToken(name, symbol, supplyWei);
    const receipt = await tx.wait();

    // Reputation: +5 for successful token creation (best-effort, non-blocking)
    try {
      const localAddr = (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('reputationAddress') : null) || REPUTATION_ADDRESS;
      if (localAddr) {
        const signer = factory.runner as ethers.Signer;
        const to = await signer.getAddress();
        const rep = new ethers.Contract(localAddr, REPUTATION_ABI, signer);
        await rep.updateScore(to, 5);
        console.log("Reputation +5 for token creation");
      }
    } catch (e) {
      console.warn("Reputation update token failed", e);
    }

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



