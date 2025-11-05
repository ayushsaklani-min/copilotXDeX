'use client';
import { FormEvent, useState } from 'react';

interface AIAssistantProps {
  onQuery: (query: string) => Promise<void> | void;
  response: string;
  isLoading: boolean;
}

export default function AIAssistant({ onQuery, response, isLoading }: AIAssistantProps) {
  const [userInput, setUserInput] = useState('');

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    await onQuery(userInput.trim());
    setUserInput('');
  };
  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
      <h2 className="text-xl font-bold text-white mb-4">AI Assistant</h2>
      <div className="mb-4">
        <div className="h-48 bg-white/5 p-4 rounded-lg overflow-y-auto">
          {response ? (
            <div className="text-gray-300 whitespace-pre-wrap">{response}</div>
          ) : (
            <div className="text-gray-400 italic">Ask me about your DeFi portfolio!</div>
          )}
        </div>
      </div>
      <form className="flex gap-3" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about your portfolio..."
          className="flex-1 bg-white/5 border border-cyan-500/30 rounded-lg p-3 text-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
