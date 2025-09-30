'use client';

import { useState, useRef, useEffect } from 'react';

interface Balances {
  [key: string]: string;
}

interface ConversationMessage {
  role: 'user' | 'ai';
  parts: Array<{ text: string }>;
}

interface AIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  balances: Balances;
  geminiApiUrl: string;
  networkName: string;
}

export default function AIAssistant({ isOpen, onToggle, balances, geminiApiUrl, networkName }: AIAssistantProps) {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [conversation]);

  // Show a friendly popup when panel opens
  useEffect(() => {
    if (isOpen) {
      try {
        const alreadyShown = typeof window !== 'undefined' && localStorage.getItem('copilot_ai_greeting_shown') === '1';
        if (!alreadyShown) {
          setShowGreeting(true);
        }
      } catch {}
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAiLoading) return;

    const newUserMessage: ConversationMessage = {
      role: 'user',
      parts: [{ text: userInput }]
    };

    setConversation(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsAiLoading(true);

    const portfolioData = JSON.stringify(balances, null, 2);
    const systemPrompt = `You are "Web3 Copilot," an expert AI crypto portfolio assistant. Your persona is helpful and concise. The user has connected their wallet on the ${networkName} network. Their current portfolio is: ${portfolioData}. Answer their questions and provide actionable insights about their holdings.`;

    const history = [...conversation, newUserMessage].map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: msg.parts
    }));

    try {
      const response = await fetch(geminiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: history,
          systemInstruction: { parts: [{ text: systemPrompt }] }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
      }

      const data = await response.json();
      const aiResponse = data.candidates[0]?.content;

      if (aiResponse) {
        setConversation(prev => [...prev, aiResponse]);
      } else {
        throw new Error("Could not get a valid response from AI.");
      }
    } catch (error: unknown) {
      const errorMessage: ConversationMessage = {
        role: 'ai',
        parts: [{ text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="neon-card rounded-lg mb-5 relative">
      {/* Greeting modal */}
      {showGreeting && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowGreeting(false)}>
          <div className="bg-white rounded-xl border-4 border-black max-w-md w-full p-5 shadow-[10px_10px_0_#000]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a7 7 0 00-7 7v2H4a2 2 0 00-2 2v2a4 4 0 004 4h12a4 4 0 004-4v-2a2 2 0 00-2-2h-1V9a7 7 0 00-7-7zm-3 9a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2z" fill="#0ea5e9"/></svg>
              <h3 className="text-2xl font-bold">Hi, I’m your Copilot</h3>
            </div>
            <p className="text-gray-700 mb-4">Ask me about your holdings, simulate swaps, or get step‑by‑step help.</p>
            <button className="w-full py-3 rounded-lg border-4 border-black bg-yellow-400 font-bold" onClick={() => {
              try { if (typeof window !== 'undefined') localStorage.setItem('copilot_ai_greeting_shown', '1'); } catch {}
              setShowGreeting(false);
            }}>Let&apos;s go</button>
          </div>
        </div>
      )}
      <div 
        className="p-4 cursor-pointer flex justify-between items-center text-xl font-bold"
        onClick={onToggle}
      >
        <span>AI Assistant</span>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`overflow-hidden will-change-[max-height] transition-[max-height] ease-in-out duration-300 ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4">
          <div 
            ref={chatWindowRef}
            className="h-[300px] neon-control p-4 overflow-y-auto flex flex-col gap-3 mb-4"
          >
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[80%] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'neon-control self-end' 
                    : 'bg-white text-black self-start'
                }`}
              >
                {msg.parts[0].text}
              </div>
            ))}
            {isAiLoading && (
              <div className="bg-white text-black self-start p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>
          <form className="flex gap-3" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask about your portfolio..."
              className="flex-grow neon-control p-3 text-base outline-none"
            />
            <button
              type="submit"
              disabled={isAiLoading || !userInput.trim()}
              className="px-5 py-3 rounded-lg neon-control text-white text-base font-bold cursor-pointer disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
