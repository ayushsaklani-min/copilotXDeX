/**
 * Hooks for game contract interactions
 */
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { contractAddresses } from '@/config/contracts-v2';
import CoinflipABI from '@/config/abis/Coinflip.json';
import MinesABI from '@/config/abis/Mines.json';
import XPRewardsABI from '@/config/abis/XPRewards.json';

// Coinflip Hooks
export function useCoinflipStats() {
  const { address } = useAccount();

  const { data: stats } = useReadContract({
    address: contractAddresses.coinflip as `0x${string}`,
    abi: CoinflipABI,
    functionName: 'getPlayerStats',
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const rawStats = stats as any[] | undefined;

  return {
    wins: rawStats ? Number(rawStats[0]) : 0,
    losses: rawStats ? Number(rawStats[1]) : 0,
    wagered: rawStats ? rawStats[2].toString() : '0',
    won: rawStats ? rawStats[3].toString() : '0',
    gamesPlayed: rawStats ? Number(rawStats[4]) : 0,
  };
}

export function usePlayCoinflip() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const play = (side: 0 | 1, betAmount: string) => {
    writeContract({
      address: contractAddresses.coinflip as `0x${string}`,
      abi: CoinflipABI,
      functionName: 'play',
      args: [side],
      value: parseEther(betAmount),
    });
  };

  return {
    play,
    isLoading: isPending,
    isSuccess,
    data,
  };
}

// Mines Hooks
export function useMinesGameState() {
  const { address } = useAccount();

  const { data: gameState, refetch } = useReadContract({
    address: contractAddresses.mines as `0x${string}`,
    abi: MinesABI,
    functionName: 'getGameState',
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const rawGameState = gameState as any[] | undefined;

  return {
    isActive: rawGameState ? rawGameState[0] : false,
    betAmount: rawGameState ? rawGameState[1].toString() : '0',
    minesCount: rawGameState ? Number(rawGameState[2]) : 0,
    tilesRevealed: rawGameState ? Number(rawGameState[3]) : 0,
    currentMultiplier: rawGameState ? Number(rawGameState[4]) : 100,
    revealedTiles: rawGameState ? rawGameState[5] : [],
    refetch,
  };
}

export function useStartMinesGame() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const startGame = (minesCount: number, betAmount: string) => {
    writeContract({
      address: contractAddresses.mines as `0x${string}`,
      abi: MinesABI,
      functionName: 'startGame',
      args: [minesCount],
      value: parseEther(betAmount),
    });
  };

  return {
    startGame,
    isLoading: isPending,
    isSuccess,
    data,
  };
}

export function useRevealTile() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const revealTile = (tileIndex: number) => {
    writeContract({
      address: contractAddresses.mines as `0x${string}`,
      abi: MinesABI,
      functionName: 'revealTile',
      args: [tileIndex],
    });
  };

  return {
    revealTile,
    isLoading: isPending,
    isSuccess,
    data,
  };
}

export function useCashOutMines() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const cashOut = () => {
    writeContract({
      address: contractAddresses.mines as `0x${string}`,
      abi: MinesABI,
      functionName: 'cashOut',
    });
  };

  return {
    cashOut,
    isLoading: isPending,
    isSuccess,
    data,
  };
}

// XP Rewards Hooks
export function useUserXP() {
  const { address } = useAccount();

  const { data: xpData } = useReadContract({
    address: contractAddresses.xpRewards as `0x${string}`,
    abi: XPRewardsABI,
    functionName: 'getUserXP',
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const rawXP = xpData as any[] | undefined;

  return {
    totalXP: rawXP ? Number(rawXP[0]) : 0,
    gameXP: rawXP ? Number(rawXP[1]) : 0,
    tradingXP: rawXP ? Number(rawXP[2]) : 0,
    socialXP: rawXP ? Number(rawXP[3]) : 0,
    level: rawXP ? Number(rawXP[4]) : 0,
    streak: rawXP ? Number(rawXP[5]) : 0,
    lastActivityDate: rawXP ? Number(rawXP[6]) : 0,
    multiplier: rawXP ? Number(rawXP[7]) : 100,
  };
}

export function useDailyMissions() {
  const { data: missions } = useReadContract({
    address: contractAddresses.xpRewards as `0x${string}`,
    abi: XPRewardsABI,
    functionName: 'getDailyMissions',
  });

  return {
    missions: missions || [],
  };
}

export default {
  useCoinflipStats,
  usePlayCoinflip,
  useMinesGameState,
  useStartMinesGame,
  useRevealTile,
  useCashOutMines,
  useUserXP,
  useDailyMissions,
};
