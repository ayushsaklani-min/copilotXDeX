// AI Assistant chat component
'use client';

import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import { ChatMessage } from '../lib/types';
import { AI_RESPONSES } from '../lib/mock-data';

export function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Web3 Copilot AI assistant. I can help you understand your portfolio, explain DeFi concepts, and guide you through swaps and liquidity provision. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate response based on keywords
    let responseContent = AI_RESPONSES.default;
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('portfolio') || lowerInput.includes('holding')) {
      responseContent = AI_RESPONSES.portfolio;
    } else if (lowerInput.includes('risk')) {
      responseContent = AI_RESPONSES.risk;
    } else if (lowerInput.includes('swap')) {
      responseContent = AI_RESPONSES.swap;
    } else if (lowerInput.includes('liquidity') || lowerInput.includes('pool')) {
      responseContent = AI_RESPONSES.liquidity;
    } else if (lowerInput.includes('gas') || lowerInput.includes('fee')) {
      responseContent = AI_RESPONSES.gas;
    }

    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsThinking(false);
  };

  return (
    <Card className="flex flex-col h-[600px] border-2 cyber-border backdrop-blur-sm bg-card/50">
      <div className="p-4 border-b border-accent/30">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary p-2 pulse-glow">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-accent">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">Your Web3 Copilot</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="rounded-full bg-accent/20 p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
              )}
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,0,110,0.5)]'
                    : 'bg-muted/80 backdrop-blur-sm border border-accent/30'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="rounded-full bg-primary p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(255,0,110,0.5)]">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isThinking && (
            <div className="flex gap-3">
              <div className="rounded-full bg-accent/20 p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="rounded-lg p-3 bg-muted/80 backdrop-blur-sm border border-accent/30">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce shadow-[0_0_10px_var(--neon-cyan)]" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce shadow-[0_0_10px_var(--neon-pink)]" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-secondary animate-bounce shadow-[0_0_10px_var(--neon-purple)]" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-accent/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your portfolio, swaps, or liquidity..."
            disabled={isThinking}
            className="border-accent/30 focus:border-accent bg-input-background/50 backdrop-blur-sm"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isThinking}
            className="shadow-[0_0_15px_rgba(255,0,110,0.5)] hover:shadow-[0_0_25px_rgba(255,0,110,0.8)]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
