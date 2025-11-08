import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { REPUTATION_ABI, REPUTATION_ADDRESS, setReputationAddressLocal } from "../constants/reputation";

export function useReputation(signer: ethers.JsonRpcSigner | null, address?: string) {
  const [score, setScore] = useState<number>(0);

  const resolveAddress = (): string | undefined => {
    try {
      const cfg = REPUTATION_ADDRESS;
      if (typeof window !== 'undefined' && window.localStorage) {
        const local = window.localStorage.getItem('reputationAddress') || undefined;
        if (cfg && local !== cfg) {
          // sync local to config for consistency
          try { setReputationAddressLocal(cfg); } catch {}
          return cfg;
        }
        return cfg || local;
      }
      return cfg;
    } catch {}
    return REPUTATION_ADDRESS;
  };

  const refreshReputation = useCallback(async () => {
    const repAddr = resolveAddress();
    if (!signer || !address || !repAddr) return;
    try {
      const rep = new ethers.Contract(repAddr, REPUTATION_ABI, signer);
      const val = await rep.getScore(address);
      setScore(Number(val));
    } catch (err: any) {
      // Only log if it's not a common RPC error to reduce console spam
      if (err?.code !== 'CALL_EXCEPTION' && 
          !err?.message?.includes('missing revert data') &&
          !err?.message?.includes('RPC endpoint returned too many errors')) {
        console.warn("Reputation fetch failed", err);
      }
      // Silently fail for common RPC issues - they'll resolve when RPC is available
    }
  }, [signer, address]);

  useEffect(() => {
    if (!signer || !address) return;
    refreshReputation();
    // Increase interval to reduce RPC load (30 seconds instead of 10)
    const id = setInterval(refreshReputation, 30000);
    return () => clearInterval(id);
  }, [refreshReputation, signer, address]);

  // Note: This function will only work if the caller is an updater or owner of the Reputation contract
  // For regular users, reputation is updated automatically by contracts (DEX, TokenFactory, etc.)
  const addPoints = async (points: number) => {
    const repAddr = resolveAddress();
    if (!signer || !address || !repAddr) return;
    try {
      const rep = new ethers.Contract(repAddr, REPUTATION_ABI, signer);
      const tx = await rep.updateScore(address, points);
      await tx.wait();
      refreshReputation();
    } catch (err) {
      console.warn("Reputation update failed - caller must be an updater or owner", err);
    }
  };

  return { score, addPoints, refreshReputation };
}


