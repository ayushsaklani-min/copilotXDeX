'use client';

import { useState } from 'react';


interface AIAssistantProps {
  onQuery: (query: string) => void;
  response: string;
  isLoading: boolean;
}

export default function AIAssistant({ onQuery, response, isLoading }: AIAssistantProps) {
  const [userInput, setUserInput] = useState('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    onQuery(userInput);
    setUserInput('');
  };

  return (
    <div className="neon-card p-6">
      <h2 className="text-xl font-bold text-white mb-4">AI Assistant</h2>
      
      <div className="mb-4">
        <div className="h-48 neon-control p-4 overflow-y-auto">
          {response ? (
            <div className="text-gray-300 whitespace-pre-wrap">
              {response}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              Ask me about your DeFi portfolio, token swaps, or any Web3 questions!
            </div>
          )}
        </div>
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
          disabled={isLoading || !userInput.trim()}
          className="px-5 py-3 rounded-lg neon-control text-white text-base font-bold cursor-pointer disabled:opacity-60"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
