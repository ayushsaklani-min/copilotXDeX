import contracts from "../config/contracts.json";

const localReputationAddress =
  (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('reputationAddress') || undefined : undefined);

export const REPUTATION_ADDRESS = ((contracts as any).reputationAddress as string | undefined) || localReputationAddress;
export const REPUTATION_ABI = [
  "function updateScore(address user,uint256 points) external",
  "function getScore(address user) external view returns(uint256)",
  "function owner() external view returns(address)",
  "event ScoreUpdated(address indexed user,uint256 newScore,uint256 addedPoints,address indexed caller)"
];

export function setReputationAddressLocal(addr: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('reputationAddress', addr);
    }
  } catch {}
}


