// Token swap component
'use client';

import { useState } from 'react';
import { Card } from './ui/card';
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
import { ArrowDownUp, Settings, Info } from 'lucide-react';
import { MOCK_TOKENS } from '../lib/mock-data';
import { useWallet } from '../lib/wallet-context';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function TokenSwap() {
  const { isConnected } = useWallet();
  const [fromToken, setFromToken] = useState(MOCK_TOKENS[0].symbol);
  const [toToken, setToToken] = useState(MOCK_TOKENS[1].symbol);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showPreview, setShowPreview] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const fromTokenData = MOCK_TOKENS.find(t => t.symbol === fromToken);
  const toTokenData = MOCK_TOKENS.find(t => t.symbol === toToken);

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value && !isNaN(Number(value))) {
      // Mock exchange rate calculation
      const rate = 2500; // Mock ETH/USDC rate
      setToAmount((Number(value) * rate).toFixed(2));
    } else {
      setToAmount('');
    }
  };

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    setIsSwapping(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSwapping(false);
    setShowPreview(false);
    toast.success('Swap completed successfully!', {
      description: `Swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
    });
    setFromAmount('');
    setToAmount('');
  };

  const priceImpact = 0.15;
  const fee = Number(fromAmount) * 0.003;

  return (
    <>
      <Card className="p-6 border-2 cyber-border backdrop-blur-sm bg-card/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-accent">Swap Tokens</h3>
          <Button variant="ghost" size="icon" className="hover:bg-accent/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Settings className="h-4 w-4 text-accent" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
              <Select value={fromToken} onValueChange={setFromToken}>
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
            {fromTokenData && (
              <p className="text-sm text-muted-foreground">
                Balance: {fromTokenData.balance} {fromTokenData.symbol}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full pulse-glow border-accent/50 hover:border-primary hover:shadow-[0_0_20px_rgba(255,0,110,0.6)]"
              onClick={handleFlip}
              disabled={!isConnected}
            >
              <ArrowDownUp className="h-4 w-4 text-accent" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  disabled
                />
              </div>
              <Select value={toToken} onValueChange={setToToken}>
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
            {toTokenData && (
              <p className="text-sm text-muted-foreground">
                Balance: {toTokenData.balance} {toTokenData.symbol}
              </p>
            )}
          </div>

          {fromAmount && toAmount && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Price Impact:</span>
                    <span className={priceImpact > 1 ? 'text-destructive' : 'text-green-600'}>
                      {priceImpact}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fee:</span>
                    <span>{fee.toFixed(4)} {fromToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slippage:</span>
                    <span>{slippage}%</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full shadow-[0_0_20px_rgba(255,0,110,0.5)] hover:shadow-[0_0_30px_rgba(255,0,110,0.8)] transition-all duration-300"
            disabled={!isConnected || !fromAmount || !toAmount}
            onClick={() => setShowPreview(true)}
          >
            {!isConnected ? 'Connect Wallet' : 'Preview Swap'}
          </Button>
        </div>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Swap</DialogTitle>
            <DialogDescription>
              Review your transaction details before confirming
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">From</span>
              <span>{fromAmount} {fromToken}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">To</span>
              <span>{toAmount} {toToken}</span>
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={priceImpact > 1 ? 'text-destructive' : ''}>{priceImpact}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee</span>
                <span>{fee.toFixed(4)} {fromToken}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min. Received</span>
                <span>{(Number(toAmount) * (1 - Number(slippage) / 100)).toFixed(2)} {toToken}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleSwap} disabled={isSwapping}>
              {isSwapping ? 'Swapping...' : 'Confirm Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
