// Wallet connection button component
'use client';

import { Button } from './ui/button';
import { useWallet } from '../lib/wallet-context';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function WalletConnectButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (isConnecting) {
    return (
      <Button disabled className="shadow-[0_0_20px_rgba(0,240,255,0.5)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-accent/50 hover:border-accent shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]">
            <Wallet className="mr-2 h-4 w-4 text-accent" />
            <span className="text-accent">{shortAddress}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-accent/30 bg-card/95 backdrop-blur-md">
          <DropdownMenuLabel className="text-accent">Connected Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-accent/30" />
          <DropdownMenuItem className="font-mono text-sm text-foreground focus:bg-accent/10">
            {address}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-accent/30" />
          <DropdownMenuItem onClick={disconnect} className="text-primary focus:bg-primary/10">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={connect} className="shadow-[0_0_20px_rgba(255,0,110,0.5)] hover:shadow-[0_0_30px_rgba(255,0,110,0.8)]">
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
