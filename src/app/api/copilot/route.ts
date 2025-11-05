import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDl9pqcEoAg1pNUyckWPurzyxiTLhEWt8w';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

interface CopilotRequest {
  query: string;
  context: {
    walletAddress?: string;
    balances?: Record<string, number>;
    reputationScore?: number;
    poolData?: any[];
    gasPrice?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CopilotRequest = await request.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser Question: ${query}`;

    // Call Gemini API
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get AI response', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

    return NextResponse.json({
      response: aiResponse,
      context: context,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Copilot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(context: CopilotRequest['context']): string {
  let prompt = `You are an expert DeFi trading assistant for TikTakDex, a decentralized exchange on Polygon Amoy testnet.

Your role is to provide:
1. Real-time trading insights and swap suggestions
2. Liquidity pool analysis and yield projections
3. Risk assessment for trades
4. Gas optimization tips
5. Portfolio recommendations

`;

  // Add wallet context
  if (context.walletAddress) {
    prompt += `\nUser Wallet: ${context.walletAddress}`;
  }

  // Add reputation context
  if (context.reputationScore !== undefined) {
    const tier = getReputationTier(context.reputationScore);
    const feeRate = getFeeRate(context.reputationScore);
    prompt += `\nReputation Score: ${context.reputationScore} XP (${tier} tier)`;
    prompt += `\nCurrent Fee Rate: ${feeRate}% (${getFeeDiscount(context.reputationScore)} discount)`;
  }

  // Add balance context
  if (context.balances && Object.keys(context.balances).length > 0) {
    prompt += `\n\nToken Balances:`;
    for (const [token, balance] of Object.entries(context.balances)) {
      prompt += `\n- ${token}: ${balance.toFixed(4)}`;
    }
  }

  // Add pool data context
  if (context.poolData && context.poolData.length > 0) {
    prompt += `\n\nAvailable Pools:`;
    context.poolData.forEach((pool: any) => {
      prompt += `\n- ${pool.name}: ${pool.reserve0} / ${pool.reserve1} (TVL: $${pool.tvl?.toFixed(2) || '0'})`;
    });
  }

  // Add gas context
  if (context.gasPrice) {
    prompt += `\n\nCurrent Gas Price: ${context.gasPrice} Gwei`;
  }

  prompt += `\n\nProvide concise, actionable advice. Focus on:
- Optimal swap routes and timing
- Slippage warnings
- Liquidity depth analysis
- Yield opportunities
- Risk factors

Be specific with numbers and recommendations. If suggesting a swap, explain why it's optimal now.`;

  return prompt;
}

function getReputationTier(score: number): string {
  if (score >= 500) return 'Diamond';
  if (score >= 100) return 'Gold';
  if (score >= 50) return 'Silver';
  return 'Bronze';
}

function getFeeRate(score: number): number {
  if (score >= 500) return 0.05;
  if (score >= 100) return 0.10;
  if (score >= 50) return 0.20;
  return 0.30;
}

function getFeeDiscount(score: number): string {
  if (score >= 500) return '83% off';
  if (score >= 100) return '67% off';
  if (score >= 50) return '33% off';
  return 'none';
}
