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
}

export default function AIAssistant({ isOpen, onToggle, balances, geminiApiUrl }: AIAssistantProps) {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [conversation]);

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
    const systemPrompt = `You are "Web3 Copilot," an expert AI crypto portfolio assistant. Your persona is helpful and concise. The user has connected their wallet on the Polygon Amoy testnet. Their current portfolio is: ${portfolioData}. Answer their questions and provide actionable insights about their holdings.`;

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
    } catch (error: any) {
      const errorMessage: ConversationMessage = {
        role: 'ai',
        parts: [{ text: `Error: ${error.message}` }]
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg mb-5 border-4 border-black">
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
            className="h-[300px] bg-gray-100 rounded-lg border-4 border-black p-4 overflow-y-auto flex flex-col gap-3 mb-4"
          >
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[80%] leading-relaxed border-4 border-black ${
                  msg.role === 'user' 
                    ? 'bg-blue-200 text-black self-end' 
                    : 'bg-white text-black self-start'
                }`}
              >
                {msg.parts[0].text}
              </div>
            ))}
            {isAiLoading && (
              <div className="bg-white text-black self-start p-3 rounded-lg border-4 border-black">
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
              className="flex-grow bg-gray-100 border-4 border-black rounded-lg p-3 text-black text-base font-mono outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isAiLoading || !userInput.trim()}
              className="px-5 py-3 rounded-lg border-4 border-black bg-yellow-400 text-black text-base font-bold cursor-pointer transition-all duration-200 hover:shadow-lg hover:transform hover:translate-x-1 hover:translate-y-1 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
