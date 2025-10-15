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

  const tier = React.useMemo(() => {
    if (score >= 1000) return { name: "Crystal", color: "bg-fuchsia-600" };
    if (score >= 500) return { name: "Diamond", color: "bg-purple-600" };
    if (score >= 250) return { name: "Gold", color: "bg-amber-600" };
    if (score >= 100) return { name: "Silver", color: "bg-zinc-500" };
    return { name: "Bronze", color: "bg-orange-600" };
  }, [score]);

  if (!address) return null;

  return (
    <div className={`fixed bottom-4 right-4 ${tier.color}/80 text-white px-4 py-2 rounded-xl text-sm shadow-lg z-50 flex items-center gap-2`}>
      <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
      <span className="font-semibold">{tier.name}</span>
      <span className="opacity-80">•</span>
      <span>Score:</span>
      <span className="font-bold">{score}</span>
    </div>
  );
}


