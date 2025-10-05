// Liquidity provision form
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { MOCK_TOKENS } from '../lib/mock-data';
import { useWallet } from '../lib/wallet-context';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './ui/alert';
import { Info } from 'lucide-react';

export function LiquidityForm() {
  const { isConnected } = useWallet();
  const [token0, setToken0] = useState(MOCK_TOKENS[0].symbol);
  const [token1, setToken1] = useState(MOCK_TOKENS[1].symbol);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const token0Data = MOCK_TOKENS.find(t => t.symbol === token0);
  const token1Data = MOCK_TOKENS.find(t => t.symbol === token1);

  const handleAmount0Change = (value: string) => {
    setAmount0(value);
    if (value && !isNaN(Number(value))) {
      // Mock balanced ratio
      const rate = 2500; // ETH/USDC rate
      setAmount1((Number(value) * rate).toFixed(2));
    } else {
      setAmount1('');
    }
  };

  const handleAddLiquidity = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAdding(false);
    toast.success('Liquidity added successfully!', {
      description: `Added ${amount0} ${token0} and ${amount1} ${token1} to the pool`,
    });
    setAmount0('');
    setAmount1('');
  };

  const shareOfPool = 0.05; // Mock value
  const expectedLP = Number(amount0) * 100; // Mock LP token amount

  return (
    <div className="space-y-6 border-2 cyber-border backdrop-blur-sm bg-card/50 p-6 rounded-lg">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Token A</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="0.0"
                value={amount0}
                onChange={(e) => handleAmount0Change(e.target.value)}
                disabled={!isConnected}
              />
            </div>
            <Select value={token0} onValueChange={setToken0}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TOKENS.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {token0Data && (
            <p className="text-sm text-muted-foreground">
              Balance: {token0Data.balance} {token0Data.symbol}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center">
            <span className="text-muted-foreground">+</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Token B</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="0.0"
                value={amount1}
                disabled
              />
            </div>
            <Select value={token1} onValueChange={setToken1}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TOKENS.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {token1Data && (
            <p className="text-sm text-muted-foreground">
              Balance: {token1Data.balance} {token1Data.symbol}
            </p>
          )}
        </div>
      </div>

      {amount0 && amount1 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Share of Pool:</span>
                <span>{shareOfPool}%</span>
              </div>
              <div className="flex justify-between">
                <span>LP Tokens:</span>
                <span>{expectedLP.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span>1 {token0} = {(Number(amount1) / Number(amount0)).toFixed(2)} {token1}</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <Info className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-600">
          Adding liquidity exposes you to impermanent loss. Ensure you understand the risks before proceeding.
        </AlertDescription>
      </Alert>

      <Button
        className="w-full shadow-[0_0_20px_rgba(255,0,110,0.5)] hover:shadow-[0_0_30px_rgba(255,0,110,0.8)] transition-all duration-300"
        disabled={!isConnected || !amount0 || !amount1 || isAdding}
        onClick={handleAddLiquidity}
      >
        {!isConnected ? 'Connect Wallet' : isAdding ? 'Adding Liquidity...' : 'Add Liquidity'}
      </Button>
    </div>
  );
}
