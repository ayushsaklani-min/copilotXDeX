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

  return {
    wins: stats ? Number(stats[0]) : 0,
    losses: stats ? Number(stats[1]) : 0,
    wagered: stats ? stats[2].toString() : '0',
    won: stats ? stats[3].toString() : '0',
    gamesPlayed: stats ? Number(stats[4]) : 0,
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

  return {
    isActive: gameState ? gameState[0] : false,
    betAmount: gameState ? gameState[1].toString() : '0',
    minesCount: gameState ? Number(gameState[2]) : 0,
    tilesRevealed: gameState ? Number(gameState[3]) : 0,
    currentMultiplier: gameState ? Number(gameState[4]) : 100,
    revealedTiles: gameState ? gameState[5] : [],
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

  return {
    totalXP: xpData ? Number(xpData[0]) : 0,
    gameXP: xpData ? Number(xpData[1]) : 0,
    tradingXP: xpData ? Number(xpData[2]) : 0,
    socialXP: xpData ? Number(xpData[3]) : 0,
    level: xpData ? Number(xpData[4]) : 0,
    streak: xpData ? Number(xpData[5]) : 0,
    lastActivityDate: xpData ? Number(xpData[6]) : 0,
    multiplier: xpData ? Number(xpData[7]) : 100,
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
