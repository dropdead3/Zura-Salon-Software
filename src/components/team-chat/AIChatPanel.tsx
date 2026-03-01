import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { cn } from '@/lib/utils';
import { useAIAgentChat } from '@/hooks/team-chat/useAIAgentChat';
import { AIMessageContent } from './AIMessageContent';

interface AIChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE_PROMPTS = [
  "What's my schedule today?",
  "Find client Jane Smith",
  "Is anyone free tomorrow at 2pm?",
  "Reschedule my 3pm to tomorrow",
];

export function AIChatPanel({ open, onOpenChange }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    pendingAction,
    sendMessage,
    confirmAction,
    cancelAction,
    clearChat,
  } = useAIAgentChat();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="440px" showCloseButton={false}>
      <div className="px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZuraAvatar size="sm" />
            <div>
              <h2 className="font-display text-sm tracking-wide uppercase">{AI_ASSISTANT_NAME_DEFAULT}</h2>
              <p className="text-xs text-muted-foreground font-sans">
                Your AI-powered salon assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-2">
              <ZuraAvatar size="lg" className="mx-auto" />
              <h3 className="font-medium">Hi, I'm {AI_ASSISTANT_NAME_DEFAULT}!</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                I can search clients, check schedules, and manage appointments for you.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Try asking
              </p>
              <div className="grid gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className={cn(
                      "text-left text-sm px-3 py-2 rounded-lg border",
                      "bg-card hover:bg-accent/50 transition-colors",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-1">
            {messages.map((message) => (
              <AIMessageContent
                key={message.id}
                message={message}
                pendingAction={pendingAction}
                onConfirmAction={confirmAction}
                onCancelAction={cancelAction}
                isExecuting={isLoading}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-border/40 shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={isLoading || !!pendingAction}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !!pendingAction}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {pendingAction && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Please confirm or cancel the action above
          </p>
        )}
      </div>
    </PremiumFloatingPanel>
  );
}
