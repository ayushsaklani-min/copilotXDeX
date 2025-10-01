'use client';

interface TokenInfo {
  address: string;
  decimals: number;
  coingeckoId: string;
}

interface Balances {
  [key: string]: string;
}

interface Prices {
  [key: string]: number;
}

interface PortfolioOverviewProps {
  isOpen: boolean;
  onToggle: () => void;
  balances: Balances;
  isBalancesLoading: boolean;
  prices: Prices;
  nativeSymbol: string;
  tokens: { [key: string]: TokenInfo };
}

const TOKEN_ICONS = {
  MATIC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4.11,8.34,11.3,4.1a2,2,0,0,1,1.4,0l7.19,4.24a2,2,0,0,1,1,1.76v8.4a2,2,0,0,1-1,1.76l-7.19,4.24a2,2,0,0,1-1.4,0L4.11,20.26a2,2,0,0,1-1-1.76V10.1A2,2,0,0,1,4.11,8.34ZM12,12.27,14.24,11a.5.5,0,0,1,.45,0l1.19.68a.5.5,0,0,1,.26.44v2.19a.5.5,0,0,1-.26.44l-1.19.69a.5.5,0,0,1-.45,0L12,16.73,9.76,18a.5.5,0,0,1-.45,0L8.12,17.29a.5.5,0,0,1,.26-.44V14.66a.5.5,0,0,1,.26-.44l1.19-.68A.5.5,0,0,1,9.76,13.56Z"></path></svg>`,
  WETH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01,2.25,11.87,2.5,6,12.08l5.87,3.42,6.13-3.42ZM12.01,16.58,6,13.16l5.87,8.2,6.13-8.2Z"></path></svg>`,
  ETH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 10-7 4-7-4 7-10zm0 12l7-4-7 12-7-12 7 4z"/></svg>`,
  DAI: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2a10,10,0,1,0,10,10A10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20ZM12,8a4,4,0,0,0-4,4H6a6,6,0,0,1,6-6Zm0,8a4,4,0,0,0,4-4h2a6,6,0,0,1-6,6Z"></path></svg>`,
  USDC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Zm-1.83-9.43a3.48,3.48,0,0,0,1.08-.2,2.68,2.68,0,0,0,1-.58,1.49,1.49,0,0,0,.43-1,1.31,1.31,0,0,0-.43-1,2.62,2.62,0,0,0-1-.59,3.58,3.58,0,0,0-1.09-.2,4,4,0,0,0-1.22.2,2.7,2.7,0,0,0-1,.58,1.39,1.39,0,0,0-.42,1v.2H8.33v-.2a3.44,3.44,0,0,1,1-2.5,5.13,5.13,0,0,1,1.94-1.2,6.33,6.33,0,0,1,2.2-.44,5.74,5.74,0,0,1,4.42,1.64,3.38,3.38,0,0,1,1.15,2.72A3.13,3.13,0,0,1,18,12.3a4.77,4.77,0,0,1-2,1.3,7.25,7.25,0,0,1-2.51.48,4.1,4.1,0,0,0-1.22-.2,3.53,3.53,0,0,0-1.09.2,2.62,2.62,0,0,0-1,.59,1.31,1.31,0,0,1-.43,1,1.49,1.49,0,0,0,.43,1,2.68,2.68,0,0,0,1,.58,3.48,3.48,0,0,0,1.08.2,3.92,3.92,0,0,0,1.22-.2,2.7,2.7,0,0,0,1-.58,1.39,1.39,0,0,0,.42-1v-.2h1.17v.2a3.44,3.44,0,0,1-1,2.5,5.13,5.13,0,0,1-1.94,1.2,6.33,6.33,0,0,1-2.2.44A5.55,5.55,0,0,1,6.5,16.5,3.47,3.47,0,0,1,5.33,13.8a3.13,3.13,0,0,1,1.17-2.73,4.77,4.77,0,0,1,2-1.3A7.25,7.25,0,0,1,11,9.28,3.67,3.67,0,0,0,10.17,10.57Z"></path></svg>`,
  POL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 12l2-2 2 2-2 2-2-2zm4-4l2-2 2 2-2 2-2-2z" fill="white"/></svg>`
};

export default function PortfolioOverview({ isOpen, onToggle, balances, isBalancesLoading, prices, nativeSymbol, tokens }: PortfolioOverviewProps) {
  // Display native first, then all discovered balance symbols
  const discovered = Object.keys(balances).filter(s => s !== nativeSymbol);
  const tokenDisplayOrder = [nativeSymbol, ...discovered];
  const uniqueOrder = Array.from(new Set(tokenDisplayOrder));
  return (
    <div className="rounded-lg mb-5 neon-card">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center text-xl font-bold"
        onClick={onToggle}
      >
        <span>Wallet Overview</span>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`overflow-hidden will-change-[max-height] transition-[max-height] ease-in-out duration-300 ${isOpen ? 'max-h-[700px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4">
          {isBalancesLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 auto-rows-fr">
              {uniqueOrder.map(symbol => (
                <div key={symbol} className="rounded-lg p-4 h-full flex flex-col justify-between neon-control">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8" 
                      dangerouslySetInnerHTML={{ __html: (TOKEN_ICONS as Record<string, string>)[symbol] || TOKEN_ICONS['MATIC'] }} 
                    />
                    <span className="text-xl font-bold text-white">{symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {balances[symbol] || '0.0000'}
                    </div>
                    {prices[symbol] && (
                      <div className="text-sm text-gray-300">
                        ${(parseFloat(balances[symbol] || '0') * prices[symbol]).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
