'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface PoolData {
  pairKey: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  lpToken: string;
  tvl: number;
}

interface DexAIAssistantProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  pools: PoolData[];
  userLpBalances: { [key: string]: string };
  userBalances?: { [key: string]: string };
}

const GEMINI_API_KEY = 'AIzaSyDl9pqcEoAg1pNUyckWPurzyxiTLhEWt8w';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export default function DexAIAssistant({ signer, address, pools, userLpBalances, userBalances: propUserBalances }: DexAIAssistantProps) {
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userBalances, setUserBalances] = useState<{ [key: string]: string }>({});

  // Fetch user token balances
  useEffect(() => {
    const fetchUserBalances = async () => {
      if (!signer || !address) return;

      try {
        const TOKENS = {
          TIK: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
          TAK: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
          TOE: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
        };

        const ERC20_ABI = [
          "function balanceOf(address) external view returns (uint256)",
          "function symbol() external view returns (string)",
        ];

        const balances: { [key: string]: string } = {};
        
        for (const [symbol, tokenAddress] of Object.entries(TOKENS)) {
          try {
            const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            const balance = await contract.balanceOf(address);
            const formattedBalance = ethers.formatEther(balance);
            balances[symbol] = formattedBalance;
          } catch (error) {
            console.error(`Error fetching ${symbol} balance:`, error);
            balances[symbol] = '0';
          }
        }

        setUserBalances(balances);
      } catch (error) {
        console.error('Error fetching user balances:', error);
        // Use prop balances as fallback
        if (propUserBalances) {
          setUserBalances(propUserBalances);
        }
      }
    };

    fetchUserBalances();
  }, [signer, address]);

  // Use prop balances if available and local balances are empty
  useEffect(() => {
    if (propUserBalances && Object.keys(propUserBalances).length > 0) {
      setUserBalances(propUserBalances);
    }
  }, [propUserBalances]);

  const handleQuery = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResponse('');

    try {
      // Prepare comprehensive DEX data for AI
      const dexData = {
        pools: pools.map(pool => ({
          pair: `${pool.token0}-${pool.token1}`,
          reserves: {
            [pool.token0]: pool.reserve0,
            [pool.token1]: pool.reserve1
          },
          totalSupply: pool.totalSupply,
          tvl: pool.tvl,
          lpToken: pool.lpToken
        })),
        userBalances: userBalances,
        userLpBalances: userLpBalances,
        totalPools: pools.length,
        totalTvl: pools.reduce((sum, pool) => sum + pool.tvl, 0)
      };

      const systemPrompt = `You are a specialized DeFi AI assistant for TikTakDex, an AMM DEX on Polygon Amoy testnet. 

Current DEX Data:
- Total Pools: ${dexData.totalPools}
- Total TVL: $${dexData.totalTvl.toFixed(2)}
- Pools: ${JSON.stringify(dexData.pools, null, 2)}
- User Token Balances: ${JSON.stringify(dexData.userBalances, null, 2)}
- User LP Token Balances: ${JSON.stringify(dexData.userLpBalances, null, 2)}

You can help with:
1. Pool analysis and recommendations
2. Liquidity provision strategies
3. Swap calculations and price impact
4. Portfolio optimization
5. Risk assessment
6. Yield farming opportunities
7. Market making strategies

Provide specific, actionable advice based on the current pool data and user's holdings.`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Query: ${query}`
            }]
          }]
        })
      });

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';
      setResponse(aiText);
    } catch (error) {
      console.error('Error calling AI:', error);
      setResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    await handleQuery(userInput);
    setUserInput('');
  };

  return (
    <div className="neon-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <h2 className="text-xl font-bold text-white">DEX AI Assistant</h2>
      </div>
      
      <div className="mb-4">
        <div className="h-48 neon-control p-4 overflow-y-auto">
          {response ? (
            <div className="text-gray-300 whitespace-pre-wrap">
              {response}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              Ask me about your pools, liquidity strategies, or get DeFi insights!
              <br /><br />
              <div className="text-sm">
                <strong>Try asking:</strong>
                <br />• &quot;What&apos;s the best pool to add liquidity to?&quot;
                <br />• &quot;How much can I earn from TIK-TOE pool?&quot;
                <br />• &quot;Should I swap my TIK for TOE now?&quot;
                <br />• &quot;What&apos;s my portfolio performance?&quot;
              </div>
            </div>
          )}
        </div>
      </div>
      
      <form className="flex gap-3" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about pools, liquidity, or DeFi strategies..."
          className="flex-grow neon-control p-3 text-base outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          className="px-5 py-3 rounded-lg neon-control text-white text-base font-bold cursor-pointer disabled:opacity-60"
        >
          {isLoading ? 'Analyzing...' : 'Ask AI'}
        </button>
      </form>
    </div>
  );
}
