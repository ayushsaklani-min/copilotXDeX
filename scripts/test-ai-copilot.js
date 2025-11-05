// Test script for AI Copilot API
// Run with: node scripts/test-ai-copilot.js

const GEMINI_API_KEY = 'AIzaSyDl9pqcEoAg1pNUyckWPurzyxiTLhEWt8w';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini AI API...\n');

  const testContext = {
    walletAddress: '0x1234...5678',
    balances: {
      TIK: 100,
      TAK: 50,
      TOE: 75
    },
    reputationScore: 150,
    poolData: [
      { name: 'TIK-TOE', reserve0: '1000', reserve1: '2000', tvl: 3000 },
      { name: 'TIK-TAK', reserve0: '500', reserve1: '500', tvl: 1000 }
    ],
    gasPrice: '30'
  };

  const systemPrompt = `You are an expert DeFi trading assistant for TikTakDex.

User Wallet: ${testContext.walletAddress}
Reputation Score: ${testContext.reputationScore} XP (Gold tier)
Current Fee Rate: 0.10% (67% discount)

Token Balances:
- TIK: 100.0000
- TAK: 50.0000
- TOE: 75.0000

Available Pools:
- TIK-TOE: 1000 / 2000 (TVL: $3000.00)
- TIK-TAK: 500 / 500 (TVL: $1000.00)

Current Gas Price: 30 Gwei

Provide concise, actionable advice about optimal swaps and yield opportunities.`;

  const testQuery = "What should I swap right now to maximize my returns?";

  console.log('📝 Test Query:', testQuery);
  console.log('\n🔄 Sending request to Gemini API...\n');

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser Question: ${testQuery}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (aiResponse) {
      console.log('✅ AI Response:\n');
      console.log('─'.repeat(60));
      console.log(aiResponse);
      console.log('─'.repeat(60));
      console.log('\n🎉 Test PASSED! AI Copilot is working!\n');
    } else {
      console.log('❌ No response generated');
      console.log('Response data:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test FAILED:', error.message);
    console.error(error);
  }
}

// Run test
testGeminiAPI();
