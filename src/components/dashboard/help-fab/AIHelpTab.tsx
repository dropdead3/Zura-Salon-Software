import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AI_ASSISTANT_NAME_DEFAULT, PLATFORM_NAME } from '@/lib/brand';

type Message = { role: 'user' | 'assistant'; content: string };

const EXAMPLE_PROMPTS = [
  'How do I request an assistant?',
  'Where can I find my stats?',
  'How do I update my profile?',
  'What is the Ring the Bell feature?',
];

export function AIHelpTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const { response, isLoading, error, sendMessage, reset } = useAIAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, response]);

  // Update messages when streaming response completes
  useEffect(() => {
    if (!isLoading && response && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        reset();
      }
    }
  }, [isLoading, response, messages, reset]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Pass conversation history for context
    await sendMessage(messageText, messages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSend(prompt);
  };

  const isEmpty = messages.length === 0 && !response;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-[280px] text-center pt-6">
              <ZuraZIcon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-display text-lg tracking-wide uppercase mb-2">{AI_ASSISTANT_NAME_DEFAULT}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                I'm {AI_ASSISTANT_NAME_DEFAULT}, your AI assistant. Ask me anything about using this platform, or your business.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-card hover:bg-card/80 border border-border/60 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'mr-auto bg-card border border-border/60'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              
              {/* Streaming response */}
              {isLoading && response && (
                <div className="mr-auto max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-card border border-border/60">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{response}</ReactMarkdown>
                  </div>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoading && !response && (
                <div className="mr-auto flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="mr-auto max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-destructive/10 text-destructive">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      
      <div className="border-t border-border/60 p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-card border-border/60"
            autoCapitalize="off"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
