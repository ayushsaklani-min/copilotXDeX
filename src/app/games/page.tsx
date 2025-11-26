'use client';

import { useState } from 'react';
import { Card, Button } from '@/design-system/components';
import { Coins, Grid3x3, Trophy, TrendingUp, Zap } from 'lucide-react';
import { useUserXP, useDailyMissions } from '@/hooks/useGames';
import { useAccount } from 'wagmi';
import CoinflipGame from '@/components/games/CoinflipGame';
import MinesGame from '@/components/games/MinesGame';

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const { address } = useAccount();
  const { totalXP, level, streak, multiplier } = useUserXP();
  // Ensure missions is always treated as an array for type safety
  const { missions = [] } = useDailyMissions() as { missions?: any[] };

  if (activeGame === 'coinflip') {
    return <CoinflipGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === 'mines') {
    return <MinesGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">GameFi Hub</h1>
          <p className="text-neutral-400">Play games, earn XP, climb the leaderboard</p>
        </div>

        {/* XP Stats */}
        <Card variant="elevated" padding="lg" className="mb-8">
          {address ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-neutral-400 text-sm mb-1">Total XP</p>
                <p className="text-3xl font-bold text-white">{totalXP.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-1">Level</p>
                <p className="text-3xl font-bold text-primary-500">{level}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-1">Streak</p>
                <p className="text-3xl font-bold text-warning-500">{streak} days</p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-1">Multiplier</p>
                <p className="text-3xl font-bold text-success-500">{(multiplier / 100).toFixed(1)}x</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-neutral-400">Connect wallet to view your stats</p>
          )}
        </Card>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Coinflip */}
          <Card variant="elevated" padding="lg" hover>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coinflip</h3>
              <p className="text-neutral-400 text-sm mb-4">50/50 chance, 2% house edge</p>
              <Button variant="primary" fullWidth onClick={() => setActiveGame('coinflip')}>
                Play Now
              </Button>
            </div>
          </Card>

          {/* Mines */}
          <Card variant="elevated" padding="lg" hover>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-warning-500 to-error-500 flex items-center justify-center">
                <Grid3x3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mines</h3>
              <p className="text-neutral-400 text-sm mb-4">Reveal tiles, avoid mines</p>
              <Button variant="primary" fullWidth onClick={() => setActiveGame('mines')}>
                Play Now
              </Button>
            </div>
          </Card>

          {/* Meme Royale */}
          <Card variant="elevated" padding="lg" hover>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-success-500 to-primary-500 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Meme Royale</h3>
              <p className="text-neutral-400 text-sm mb-4">Vote for winning token</p>
              <Button variant="primary" fullWidth onClick={() => setActiveGame('royale')}>
                Join Tournament
              </Button>
            </div>
          </Card>

          {/* Predict Price */}
          <Card variant="elevated" padding="lg" hover>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-secondary-500 to-warning-500 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Predict Price</h3>
              <p className="text-neutral-400 text-sm mb-4">Guess price direction</p>
              <Button variant="primary" fullWidth onClick={() => setActiveGame('predict')}>
                Make Prediction
              </Button>
            </div>
          </Card>
        </div>

        {/* Daily Missions */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-6 h-6 text-warning-500" />
            <h2 className="text-2xl font-bold text-white">Daily Missions</h2>
          </div>
          {address ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.length > 0 ? (
                missions.map((mission: any, i: number) => (
                  <div key={i} className="p-4 bg-dark-bg-secondary rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-medium">{mission.description}</h3>
                      <span className="text-warning-500 font-bold">+{Number(mission.xpReward)} XP</span>
                    </div>
                    <div className="w-full bg-dark-bg-primary rounded-full h-2 mb-2">
                      <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: '0%' }} />
                    </div>
                    <p className="text-neutral-400 text-sm">0/{Number(mission.requirement)} completed</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-400 col-span-2 text-center">No missions available</p>
              )}
            </div>
          ) : (
            <p className="text-center text-neutral-400">Connect wallet to view missions</p>
          )}
        </Card>
      </div>
    </div>
  );
}
