"use client";
import React from "react";
import { ethers } from "ethers";
import { useReputation } from "@/hooks/useReputation";

export default function ReputationBadge(){
  const [signer, setSigner] = React.useState<ethers.Signer | null>(null);
  const [address, setAddress] = React.useState<string>("");

  React.useEffect(() => {
    const anyWindow = window as unknown as { ethereum?: unknown };
    if (anyWindow.ethereum && typeof anyWindow.ethereum === 'object') {
      const provider = new ethers.BrowserProvider(anyWindow.ethereum as ethers.Eip1193Provider);
      provider.getSigner().then(async (sgn) => {
        setSigner(sgn);
        try {
          const addr = await sgn.getAddress();
          setAddress(addr);
        } catch {
          try {
            await provider.send("eth_requestAccounts", []);
            const addr = await sgn.getAddress();
            setAddress(addr);
          } catch {}
        }
      }).catch(() => {});
    }
  }, []);

  const { score } = useReputation(signer, address);

  if (!address) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-cyan-600/80 text-white px-4 py-2 rounded-xl text-sm shadow-lg z-50">
      Reputation Score: <span className="font-bold">{score}</span>
    </div>
  );
}


