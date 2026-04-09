import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useCommandSearch } from './useCommandSearch';
import { useRecentSearches } from './useRecentSearches';
import { isQuestionQuery, groupResults } from './commandTypes';
import { CommandInput } from './CommandInput';
import { CommandResultPanel } from './CommandResultPanel';
import { CommandAIAnswerCard } from './CommandAIAnswerCard';
import { CommandEmptyState } from './CommandEmptyState';
import { CommandRecentSection } from './CommandRecentSection';
import { useActionExecution } from '@/hooks/useActionExecution';
import { usePermission } from '@/hooks/usePermission';
import { parseQuery } from '@/lib/queryParser';
import { CommandActionPanel } from './CommandActionPanel';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
  platformRoles?: string[];
}

interface ZuraCommandSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterNavItems?: (items: NavItem[]) => NavItem[];
}

export function ZuraCommandSurface({ open, onOpenChange, filterNavItems }: ZuraCommandSurfaceProps) {
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = usePermission();

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage, reset: resetAI } = useAIAssistant();
  const { results } = useCommandSearch(query, { filterNavItems });
  const { recents, addRecent, clearRecents } = useRecentSearches();
  const actionExecution = useActionExecution();

  const recentPages = useMemo(() => {
    return [];
  }, []);

  const showAICard = aiMode || (query.trim() && isQuestionQuery(query));
  const hasResults = results.length > 0;
  const hasQuery = query.trim().length > 0;
  const hasActiveAction = actionExecution.actionState !== 'idle';

  const flatResults = useMemo(() => {
    return groupResults(results).flatMap(g => g.results);
  }, [results]);

  // Detect actions from parsed query
  useEffect(() => {
    if (hasQuery && !aiMode) {
      const parsed = parseQuery(query);
      if (parsed.actionIntent) {
        actionExecution.detectAndPrepare(parsed, permissions);
      } else {
        actionExecution.reset();
      }
    } else {
      actionExecution.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, aiMode, permissions]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setAiMode(false);
      setSelectedIndex(0);
      resetAI();
      actionExecution.reset();
    }
  }, [open, resetAI, actionExecution.reset]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSelect = useCallback((result: { path?: string; title?: string }) => {
    if (result.path) {
      if (query.trim()) addRecent(query.trim());
      navigate(result.path);
      close();
    }
  }, [navigate, close, query, addRecent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Tab' && !e.shiftKey && !query) {
      e.preventDefault();
      setAiMode(m => !m);
      resetAI();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if ((aiMode || isQuestionQuery(query)) && query.trim()) {
        addRecent(query.trim());
        sendMessage(query);
      } else if (flatResults[selectedIndex]) {
        handleSelect(flatResults[selectedIndex]);
      }
    }
  }, [query, aiMode, flatResults, selectedIndex, handleSelect, close, resetAI, sendMessage, addRecent]);

  const handleRecentSearchSelect = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handleRecentPageSelect = useCallback((path: string) => {
    navigate(path);
    close();
  }, [navigate, close]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 border-border',
          tokens.drawer.content,
          'rounded-xl max-w-2xl w-[calc(100vw-2rem)]',
          'max-h-[min(600px,80vh)]',
          'flex flex-col',
          'sm:max-w-2xl max-sm:max-w-none max-sm:w-screen max-sm:h-screen max-sm:max-h-screen max-sm:rounded-none max-sm:border-0'
        )}
        overlayClassName={tokens.drawer.overlay}
        style={{ left: 'calc(50% + var(--sidebar-offset, 0px))' }}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <span className="sr-only">Search</span>

        <CommandInput
          query={query}
          onQueryChange={setQuery}
          aiMode={aiMode}
          onAiModeToggle={() => { setAiMode(m => !m); resetAI(); }}
          onKeyDown={handleKeyDown}
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          {hasQuery && showAICard && (
            <CommandAIAnswerCard
              response={aiResponse}
              isLoading={aiLoading}
              error={aiError}
            />
          )}

          {hasActiveAction && actionExecution.activeAction && (
            <CommandActionPanel
              action={actionExecution.activeAction}
              actionState={actionExecution.actionState}
              missingInputs={actionExecution.missingInputs}
              collectedInputs={actionExecution.collectedInputs}
              result={actionExecution.result}
              onProvideInput={actionExecution.provideInput}
              onSubmitInputs={actionExecution.submitInputs}
              onConfirm={() => {
                actionExecution.confirm();
                close();
              }}
              onCancel={actionExecution.cancel}
            />
          )}

          {hasQuery ? (
            hasResults ? (
              <CommandResultPanel
                results={results}
                selectedIndex={selectedIndex}
                query={query}
                onSelect={handleSelect}
              />
            ) : (
              !aiMode && !hasActiveAction && (
                <CommandEmptyState
                  query={query}
                  onSwitchToAI={() => { setAiMode(true); }}
                />
              )
            )
          ) : (
            <CommandRecentSection
              recentSearches={recents}
              recentPages={recentPages}
              onSearchSelect={handleRecentSearchSelect}
              onPageSelect={handleRecentPageSelect}
              onClearRecents={clearRecents}
            />
          )}
        </div>

        <div className="border-t border-border/30 px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground font-sans shrink-0">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">Tab</kbd>
            AI mode
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
                />
              )
            )
          ) : (
            <CommandRecentSection
              recentSearches={recents}
              recentPages={recentPages}
              onSearchSelect={handleRecentSearchSelect}
              onPageSelect={handleRecentPageSelect}
              onClearRecents={clearRecents}
            />
          )}
        </div>

        <div className="border-t border-border/30 px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground font-sans shrink-0">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">Tab</kbd>
            AI mode
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
