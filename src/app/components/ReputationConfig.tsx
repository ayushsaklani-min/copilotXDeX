"use client";
import React from "react";
import { ethers } from "ethers";
import { REPUTATION_ABI, REPUTATION_ADDRESS, setReputationAddressLocal } from "@/constants/reputation";

export default function ReputationConfig() {
  const [addr, setAddr] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const current = (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('reputationAddress') : null) || REPUTATION_ADDRESS || "";
      setAddr(current || "");
    } catch {}
  }, []);

  const save = async () => {
    try {
      if (!addr || !ethers.isAddress(addr)) {
        setStatus("Enter a valid address");
        return;
      }
      setReputationAddressLocal(addr);
      setStatus("Saved. Verifying...");
      // Optional lightweight verification
      const anyWindow = window as unknown as { ethereum?: unknown };
      if (anyWindow.ethereum && typeof anyWindow.ethereum === 'object') {
        const provider = new ethers.BrowserProvider(anyWindow.ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();
        const rep = new ethers.Contract(addr, REPUTATION_ABI, signer);
        try {
          await rep.owner();
          setStatus("Saved and verified ✓");
        } catch {
          setStatus("Saved. Verification skipped");
        }
      } else {
        setStatus("Saved");
      }
    } catch {
      setStatus("Failed to save");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <input
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="Reputation contract address"
        className="flex-1 p-2 rounded bg-black/30 border border-gray-700 text-white font-mono text-xs"
      />
      <button onClick={save} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-semibold">Save</button>
      {status && <span className="text-xs text-cyan-300">{status}</span>}
    </div>
  );
}


