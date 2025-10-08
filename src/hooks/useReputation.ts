import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { REPUTATION_ABI, REPUTATION_ADDRESS } from "../constants/reputation";

export function useReputation(signer: ethers.Signer | null, address?: string) {
  const [score, setScore] = useState<number>(0);

  const resolveAddress = (): string | undefined => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const local = window.localStorage.getItem('reputationAddress') || undefined;
        return local || REPUTATION_ADDRESS;
      }
    } catch {}
    return REPUTATION_ADDRESS;
  };

  const refresh = async () => {
    const repAddr = resolveAddress();
    if (!signer || !address || !repAddr) return;
    try {
      const rep = new ethers.Contract(repAddr, REPUTATION_ABI, signer);
      const val = await rep.getScore(address);
      setScore(Number(val));
    } catch (err) {
      console.warn("Reputation fetch failed", err);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [signer, address]);

  const addPoints = async (points: number) => {
    const repAddr = resolveAddress();
    if (!signer || !address || !repAddr) return;
    try {
      const rep = new ethers.Contract(repAddr, REPUTATION_ABI, signer);
      const tx = await rep.updateScore(address, points);
      await tx.wait();
      refresh();
    } catch (err) {
      console.warn("Reputation update failed", err);
    }
  };

  return { score, addPoints, refresh };
}


