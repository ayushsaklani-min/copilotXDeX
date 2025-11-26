'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/design-system/components';
import { ArrowLeft, Bomb, Gem } from 'lucide-react';
import { useStartMinesGame, useRevealTile, useCashOutMines, useMinesGameState } from '@/hooks/useGames';
import { useAccount } from 'wagmi';

interface MinesGameProps {
  onBack: () => void;
}

export default function MinesGame({ onBack }: MinesGameProps) {
  const { address } = useAccount();
  const [betAmount, setBetAmount] = useState('0.01');
  const [minesCount, setMinesCount] = useState(3);
  const { startGame, isLoading: isStarting } = useStartMinesGame();
  const { revealTile, isLoading: isRevealing } = useRevealTile();
  const { cashOut, isLoading: isCashingOut } = useCashOutMines();
  const { isActive, betAmount: activeBet, minesCount: activeMines, tilesRevealed, currentMultiplier, revealedTiles, refetch } = useMinesGameState();

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        refetch();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isActive, refetch]);

  const handleStartGame = () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }
    startGame(minesCount, betAmount);
  };

  const handleRevealTile = (index: number) => {
    if (!isActive || revealedTiles[index]) return;
    revealTile(index);
  };

  const handleCashOut = () => {
    if (!isActive) return;
    cashOut();
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="w-5 h-5" />} className="mb-6">
          Back to Games
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mines</h1>
          <p className="text-neutral-400">Reveal tiles, avoid mines, cash out anytime</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Grid */}
          <div className="lg:col-span-2">
            <Card variant="elevated" padding="lg">
              {isActive ? (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-neutral-400">Multiplier</span>
                      <span className="text-2xl font-bold text-primary-500">{(currentMultiplier / 100).toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400">Potential Win</span>
                      <span className="text-xl font-bold text-success-500">
                        {((Number(activeBet) / 1e18) * (currentMultiplier / 100)).toFixed(4)} MATIC
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleRevealTile(index)}
                        disabled={revealedTiles[index] || isRevealing}
                        className={`aspect-square rounded-lg border-2 transition-all ${
                          revealedTiles[index]
                            ? 'bg-success-500/20 border-success-500'
                            : 'bg-dark-bg-secondary border-dark-border-primary hover:border-primary-500 hover:bg-dark-bg-hover'
                        }`}
                      >
                        {revealedTiles[index] && (
                          <div className="flex items-center justify-center h-full">
                            <Gem className="w-6 h-6 text-success-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleCashOut}
                    disabled={isCashingOut || tilesRevealed === 0}
                  >
                    {isCashingOut ? 'Cashing Out...' : `Cash Out (${((Number(activeBet) / 1e18) * (currentMultiplier / 100)).toFixed(4)} MATIC)`}
                  </Button>
                </>
              ) : (
                <div className="text-center py-12">
                  <Bomb className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
                  <p className="text-neutral-400 mb-6">Start a new game to play</p>
                  <div className="grid grid-cols-5 gap-2 opacity-50">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-lg bg-dark-bg-secondary border-2 border-dark-border-primary"
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Card variant="elevated" padding="lg">
              <h3 className="text-xl font-bold text-white mb-4">Game Settings</h3>
              {!isActive ? (
                <div className="space-y-4">
                  <Input
                    label="Bet Amount (MATIC)"
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="0.01"
                    min="0.01"
                    max="5"
                    step="0.01"
                  />

                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">
                      Mines: {minesCount}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="20"
                      value={minesCount}
                      onChange={(e) => setMinesCount(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-neutral-500 mt-1">
                      <span>3 (Easy)</span>
                      <span>20 (Hard)</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleStartGame}
                    disabled={isStarting || !address}
                  >
                    {isStarting ? 'Starting...' : `Start Game (${betAmount} MATIC)`}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Bet Amount</span>
                    <span className="text-white font-bold">{(Number(activeBet) / 1e18).toFixed(4)} MATIC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Mines</span>
                    <span className="text-white font-bold">{activeMines}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Tiles Revealed</span>
                    <span className="text-white font-bold">{tilesRevealed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Safe Tiles Left</span>
                    <span className="text-white font-bold">{25 - activeMines - tilesRevealed}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card variant="glass" padding="lg">
              <h3 className="text-lg font-bold text-white mb-2">Game Rules</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>• Min bet: 0.01 MATIC</li>
                <li>• Max bet: 5 MATIC</li>
                <li>• 5x5 grid (25 tiles)</li>
                <li>• Choose 3-20 mines</li>
                <li>• More mines = higher multiplier</li>
                <li>• Cash out anytime</li>
                <li>• Hit a mine = lose bet</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
