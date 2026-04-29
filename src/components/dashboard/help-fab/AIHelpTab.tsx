import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, ChevronRight, Clock, Plus, ArrowDown, Copy, Check } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAIAgentChat, type AIMessage } from '@/hooks/team-chat/useAIAgentChat';
import { AIActionPreview } from '@/components/team-chat/AIActionPreview';
import { AIHistoryPanel } from './AIHistoryPanel';
import { DotsLoader } from '@/components/ui/loaders/DotsLoader';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

const ROLE_PROMPTS: Record<string, string[]> = {
  leadership: [
    'How is my business performing this week?',
    'Show me team utilization insights',
    'How do I set up commission structures?',
    'What reports are available for revenue?',
  ],
  manager: [
    'Who has open slots today?',
    'How do I manage team schedules?',
    'Where can I see daily performance?',
    'How do I handle a client complaint?',
  ],
  stylist: [
    'Where can I find my stats?',
    'How do I update my profile?',
    'How does the 3-Second Rebook work?',
    'What is the Ring the Bell feature?',
  ],
  front_desk: [
    'How do I book an appointment?',
    'How do I check a client in?',
    'Where can I find client contact info?',
    'How do I process a checkout?',
  ],
  default: [
    'How do I request an assistant?',
    'Where can I find my stats?',
    'How do I update my profile?',
    'What is the Ring the Bell feature?',
  ],
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          toast.error('Could not copy');
        }
      }}
      aria-label="Copy message"
      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function AIHelpTab() {
  const roles = useEffectiveRoles();
  const prompts = useMemo(() => {
    if (roles.some((r) => r === 'super_admin' || r === 'admin')) return ROLE_PROMPTS.leadership;
    if (roles.includes('manager')) return ROLE_PROMPTS.manager;
    if (roles.includes('receptionist')) return ROLE_PROMPTS.front_desk;
    if (roles.includes('stylist')) return ROLE_PROMPTS.stylist;
    return ROLE_PROMPTS.default;
  }, [roles]);

  const {
    messages,
    isLoading,
    isHydrating,
    pendingAction,
    conversationId,
    sendMessage,
    confirmAction,
    cancelAction,
    startNewChat,
    loadConversation,
  } = useAIAgentChat();

  const [inputValue, setInputValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showJumpPill, setShowJumpPill] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve the actual scrollable viewport inside shadcn ScrollArea.
  const getViewport = useCallback((): HTMLElement | null => {
    return (scrollRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null) ?? null;
  }, []);

  // Auto-scroll to bottom on new content (unless user has scrolled up).
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      return;
    }
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom < 240) {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [messages, pendingAction, isLoading, isHydrating, getViewport]);

  // Track whether user has scrolled away from the bottom to show the jump pill.
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const onScroll = () => {
      const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowJumpPill(distance > 240);
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [getViewport, messages.length]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;
    setInputValue('');
    await sendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;
  const showSuggestionStrip = !isEmpty && messages.length <= 1 && !pendingAction;

  // "+ New" rules
  const newDisabledReason = pendingAction
    ? 'Resolve the pending action first'
    : isLoading
      ? 'Wait for the current reply to finish'
      : isEmpty && !conversationId
        ? 'You are already on a fresh chat'
        : null;
  const newDisabled = newDisabledReason !== null;

  const handleNewChat = () => {
    if (newDisabled) return;
    startNewChat();
    toast.success('New conversation started');
  };

  const handleSelectConversation = (id: string) => {
    if (pendingAction) {
      toast.error('Resolve the pending action first');
      return;
    }
    setHistoryOpen(false);
    loadConversation(id);
  };

  const renderActionForMessage = (msg: AIMessage) => {
    if (!msg.action) return null;
    const status = msg.action.status;
    if (status === 'pending_confirmation' || status === 'confirmed') return null;
    return (
      <div className="mt-2">
        <AIActionPreview
          action={msg.action}
          onConfirm={() => {}}
          onCancel={() => {}}
          isExecuting={false}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-end gap-1 px-3 pt-2 pb-1 border-b border-border/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen(true)}
              className="h-7 px-2.5 rounded-full text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Clock className="h-3.5 w-3.5" />
              History
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Browse past conversations</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNewChat}
                disabled={newDisabled}
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs gap-1.5',
                  newDisabled
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {newDisabledReason ?? 'Start a new conversation'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 relative min-h-0">
        <ScrollArea className="absolute inset-0 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {isHydrating ? (
              <div className="flex flex-col items-center justify-center min-h-[360px] text-center pt-6 gap-3">
                <ZuraZIcon className="w-7 h-7 text-primary/60 animate-pulse" />
                <p className="text-xs text-muted-foreground/70">Loading conversation…</p>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center text-center pt-4 pb-2">
                <div className="relative mb-4">
                  <div className="absolute inset-0 -m-6 rounded-full bg-primary/15 blur-2xl animate-pulse" />
                  <div className="relative w-14 h-14 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
                    <ZuraZIcon className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <h3 className="font-display text-lg tracking-wide uppercase mb-2">
                  {AI_ASSISTANT_NAME_DEFAULT}
                </h3>
                <p className="text-sm text-muted-foreground/70 mb-5 max-w-[260px]">
                  Your AI assistant. Ask questions or request actions — anything destructive needs your approval.
                </p>
                <div className="w-full space-y-1.5">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/30 border-l-2 border-l-primary/30 hover:border-border/50 transition-all duration-200 text-left group"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'group max-w-[85%] px-4 py-2.5 text-sm',
                        msg.role === 'user'
                          ? 'ml-auto bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm'
                          : 'mr-auto rounded-2xl rounded-bl-md bg-card/80 backdrop-blur-sm border border-border/40'
                      )}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <ZuraZIcon className="w-4 h-4 text-primary animate-pulse" />
                          <DotsLoader size="sm" />
                          <span className="text-xs text-muted-foreground/60">Thinking…</span>
                        </div>
                      ) : msg.role === 'assistant' ? (
                        <div className="flex gap-2.5">
                          <ZuraZIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {renderActionForMessage(msg)}
                            <div className="flex items-center justify-end mt-1">
                              <CopyButton text={msg.content} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {pendingAction && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mr-auto w-full"
                  >
                    <AIActionPreview
                      action={pendingAction}
                      onConfirm={confirmAction}
                      onCancel={cancelAction}
                      isExecuting={isLoading}
                    />
                  </motion.div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {showJumpPill && (
          <button
            type="button"
            onClick={() => bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-card/95 backdrop-blur border border-border/60 shadow-md text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            aria-label="Jump to latest message"
          >
            <ArrowDown className="h-3 w-3" />
            Latest
          </button>
        )}
      </div>

      {showSuggestionStrip && (
        <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-border/20">
          {prompts.slice(0, 3).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleSend(p)}
              disabled={isLoading || !!pendingAction}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/30 transition-colors disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3 pt-1">
        <div className="h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 mb-3" />
        <div className="relative">
          <ZuraZIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingAction
                ? 'Resolve the pending action above…'
                : 'Ask a question or request an action...'
            }
            disabled={isLoading || isHydrating || !!pendingAction}
            className="rounded-full bg-muted/50 border-border/40 pl-9 pr-12 h-10"
            autoCapitalize="off"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading || isHydrating || !!pendingAction}
            aria-label="Send message"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground hover:scale-110 transition-all duration-200"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {historyOpen && (
        <AIHistoryPanel
          activeConversationId={conversationId}
          onSelect={handleSelectConversation}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
