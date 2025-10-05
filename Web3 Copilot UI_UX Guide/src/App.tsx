import { WalletProvider, useWallet } from './lib/wallet-context';
import { WalletConnectButton } from './components/wallet-connect-button';
import { PortfolioOverview } from './components/portfolio-overview';
import { AIAssistant } from './components/ai-assistant';
import { DEXSuite } from './components/dex-suite';
import { LandingPage } from './components/landing-page';
import { Toaster } from './components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Wallet, TrendingUp, Bot, Repeat } from 'lucide-react';
import { CyberBackground } from './components/cyber-background';
import { ClickEffect } from './components/click-effect';

function AppContent() {
  const { isConnected } = useWallet();

  // Show landing page when wallet is not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <CyberBackground />
        <ClickEffect />
        <LandingPage />
        <Toaster />
      </div>
    );
  }

  // Show main dashboard when wallet is connected
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Cyberpunk Background */}
      <CyberBackground />
      
      {/* Click Effect */}
      <ClickEffect />
      
      {/* Header */}
      <header className="border-b cyber-border sticky top-0 bg-background/80 backdrop-blur-xl z-50 relative">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2 pulse-glow">
                <Wallet className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <h1 className="neon-text text-xl">Web3 Copilot</h1>
                <p className="text-xs text-secondary font-medium hidden sm:block">on Polygon Amoy</p>
              </div>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="dashboard">
                <TrendingUp className="mr-2 h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="dex">
                <Repeat className="mr-2 h-4 w-4" />
                DEX
              </TabsTrigger>
              <TabsTrigger value="assistant">
                <Bot className="mr-2 h-4 w-4" />
                AI Assistant
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <PortfolioOverview />
                <div className="space-y-6">
                  <AIAssistant />
                </div>
              </div>
            </TabsContent>

            {/* DEX Tab */}
            <TabsContent value="dex">
              <div className="max-w-2xl mx-auto">
                <DEXSuite />
              </div>
            </TabsContent>

            {/* AI Assistant Tab */}
            <TabsContent value="assistant">
              <div className="max-w-3xl mx-auto">
                <AIAssistant />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t cyber-border mt-16 relative z-10 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">© 2025 Web3 Copilot</p>
              <span className="text-muted-foreground/50">•</span>
              <p className="text-secondary font-semibold">Built with Polygon</p>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-secondary transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(130,71,229,0.8)]">Docs</a>
              <a href="#" className="text-muted-foreground hover:text-accent transition-all duration-300 hover:drop-shadow-[0_0_10px_var(--neon-cyan)]">Support</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:drop-shadow-[0_0_10px_var(--neon-pink)]">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
