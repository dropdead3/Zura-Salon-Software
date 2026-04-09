import { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { DotsLoader } from '@/components/ui/loaders/DotsLoader';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, response]);

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
            <div className="flex flex-col items-center justify-center h-[320px] text-center pt-8">
              {/* Glow behind icon */}
              <div className="relative mb-5">
                <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-xl animate-pulse" />
                <ZuraZIcon className="relative w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-lg tracking-wide uppercase mb-2">{AI_ASSISTANT_NAME_DEFAULT}</h3>
              <p className="text-sm text-muted-foreground/70 mb-8 max-w-[260px]">
                Your AI assistant. Ask me anything about using this platform, or your business.
              </p>
              <div className="w-full space-y-1.5">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/30 hover:border-border/50 transition-all duration-200 text-left group"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'max-w-[85%] px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm'
                        : 'mr-auto rounded-2xl rounded-bl-md bg-card/80 backdrop-blur-sm border border-border/40'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="flex gap-2.5">
                        {(idx === 0 || messages[idx - 1]?.role === 'user') && (
                          <ZuraZIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 flex-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Streaming response */}
              {isLoading && response && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm bg-card/80 backdrop-blur-sm border border-border/40"
                >
                  <div className="flex gap-2.5">
                    <ZuraZIcon className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-pulse" />
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 flex-1">
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Loading indicator */}
              {isLoading && !response && (
                <div className="mr-auto flex items-center gap-2.5 text-muted-foreground text-sm px-1">
                  <ZuraZIcon className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs">{AI_ASSISTANT_NAME_DEFAULT} is thinking</span>
                  <DotsLoader size="sm" />
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
      
      <div className="p-3">
        <div className="h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 mb-3" />
        <div className="relative">
          <ZuraZIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="rounded-full bg-muted/50 border-border/40 pl-9 pr-12 h-10"
            autoCapitalize="off"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground hover:scale-110 transition-all duration-200"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
