'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@/design-system/components';
import { ArrowLeft, Coins } from 'lucide-react';
import { usePlayCoinflip, useCoinflipStats } from '@/hooks/useGames';
import { useAccount } from 'wagmi';

interface CoinflipGameProps {
  onBack: () => void;
}

export default function CoinflipGame({ onBack }: CoinflipGameProps) {
  const { address } = useAccount();
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedSide, setSelectedSide] = useState<0 | 1>(0);
  const { play, isLoading, isSuccess } = usePlayCoinflip();
  const { wins, losses, wagered, won, gamesPlayed } = useCoinflipStats();

  const handlePlay = () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }
    play(selectedSide, betAmount);
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="w-5 h-5" />} className="mb-6">
          Back to Games
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Coinflip</h1>
          <p className="text-neutral-400">50/50 chance, 2% house edge</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Card */}
          <Card variant="elevated" padding="lg">
            <div className="text-center mb-6">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                <Coins className="w-16 h-16 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Bet Amount (MATIC)"
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.01"
                min="0.01"
                max="10"
                step="0.01"
              />

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Choose Side</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedSide(0)}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedSide === 0
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border-primary bg-dark-bg-secondary hover:border-primary-500/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">🪙</div>
                    <p className="text-white font-bold">HEADS</p>
                  </button>
                  <button
                    onClick={() => setSelectedSide(1)}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedSide === 1
                        ? 'border-secondary-500 bg-secondary-500/10'
                        : 'border-dark-border-primary bg-dark-bg-secondary hover:border-secondary-500/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">🎯</div>
                    <p className="text-white font-bold">TAILS</p>
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handlePlay}
                disabled={isLoading || !address}
              >
                {isLoading ? 'Playing...' : `Play (${betAmount} MATIC)`}
              </Button>

              {isSuccess && (
                <div className="p-4 bg-success-500/10 border border-success-500 rounded-lg">
                  <p className="text-success-500 text-center font-medium">Game played! Check results below.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Stats Card */}
          <div className="space-y-6">
            <Card variant="elevated" padding="lg">
              <h3 className="text-xl font-bold text-white mb-4">Your Stats</h3>
              {address ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Games Played</span>
                    <span className="text-white font-bold">{gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Wins</span>
                    <span className="text-success-500 font-bold">{wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Losses</span>
                    <span className="text-error-500 font-bold">{losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Win Rate</span>
                    <span className="text-white font-bold">
                      {gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Wagered</span>
                    <span className="text-white font-bold">{(Number(wagered) / 1e18).toFixed(4)} MATIC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Won</span>
                    <span className="text-success-500 font-bold">{(Number(won) / 1e18).toFixed(4)} MATIC</span>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400 text-center">Connect wallet to view stats</p>
              )}
            </Card>

            <Card variant="glass" padding="lg">
              <h3 className="text-lg font-bold text-white mb-2">Game Rules</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>• Min bet: 0.01 MATIC</li>
                <li>• Max bet: 10 MATIC</li>
                <li>• House edge: 2%</li>
                <li>• Win payout: 1.96x</li>
                <li>• Earn 5 XP per game</li>
                <li>• Bonus 10 XP for wins</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
