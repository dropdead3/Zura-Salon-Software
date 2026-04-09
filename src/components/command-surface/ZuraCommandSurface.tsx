import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useSearchRanking } from '@/hooks/useSearchRanking';
import { useRecentSearches } from './useRecentSearches';
import { isQuestionQuery } from './commandTypes';
import { CommandInput } from './CommandInput';
import { CommandResultPanel } from './CommandResultPanel';
import { CommandAIAnswerCard } from './CommandAIAnswerCard';
import { CommandRecentSection } from './CommandRecentSection';
import { CommandSuggestionPanel } from './CommandSuggestionRow';
import { useActionExecution } from '@/hooks/useActionExecution';
import { usePermission } from '@/hooks/usePermission';
import { CommandActionPanel } from './CommandActionPanel';
import { useSearchLearning } from '@/hooks/useSearchLearning';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import {
  mainNavItems,
  myToolsNavItems,
  manageNavItems,
  systemNavItems,
  hubChildrenItems,
} from '@/config/dashboardNav';

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

// Build a label lookup from all nav sources for frequency-based recent pages
const NAV_LABEL_MAP = (() => {
  const map = new Map<string, string>();
  const add = (items: { href: string; label: string }[]) => {
    items.forEach((i) => { if (!map.has(i.href)) map.set(i.href, i.label); });
  };
  add(mainNavItems as any[]);
  add(myToolsNavItems as any[]);
  add(manageNavItems as any[]);
  add(systemNavItems as any[]);
  add(hubChildrenItems);
  return map;
})();

export function ZuraCommandSurface({ open, onOpenChange, filterNavItems }: ZuraCommandSurfaceProps) {
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = usePermission();
  const effectiveRoles = useEffectiveRoles();
  const lastQueryBeforeCloseRef = useRef('');

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage, reset: resetAI } = useAIAssistant();
  const { recents, addRecent, clearRecents } = useRecentSearches();
  const actionExecution = useActionExecution();

  // Search Learning
  const learning = useSearchLearning(open, effectiveRoles as string[], location.pathname);
  const decayedFreqMap = useMemo(() => learning.getDecayedFrequencyMap(), [open]);

  // Use the unified ranking hook
  const {
    groups,
    suggestions,
    parsedQuery,
    rankedResults,
    trackNavigation,
  } = useSearchRanking(query, {
    filterNavItems: filterNavItems as any,
    permissions,
    learningBoostFn: learning.getLearningBoosts,
    decayedFrequencyMap: decayedFreqMap,
  });

  // Derive recent pages from frequency map
  const recentPages = useMemo(() => {
    const freqMap = getFrequencyMap();
    return Object.entries(freqMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path]) => ({
        label: NAV_LABEL_MAP.get(path) || path.split('/').pop() || path,
        path,
      }));
  }, []);

  const showAICard = aiMode || (query.trim() && isQuestionQuery(query));
  const flatResults = useMemo(() => groups.flatMap(g => g.results), [groups]);
  const hasResults = flatResults.length > 0;
  const hasQuery = query.trim().length > 0;
  const hasActiveAction = actionExecution.actionState !== 'idle';
  const hasSuggestions = suggestions.length > 0;

  // Detect actions from parsed query (uses ranking pipeline output — no double-parse)
  useEffect(() => {
    if (hasQuery && !aiMode && parsedQuery?.actionIntent) {
      actionExecution.detectAndPrepare(parsedQuery, permissions);
    } else if (!hasQuery || aiMode) {
      actionExecution.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedQuery, aiMode, permissions, hasQuery]);

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
      trackNavigation(result.path);
      navigate(result.path);
      close();
    }
  }, [navigate, close, query, addRecent, trackNavigation]);

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
    trackNavigation(path);
    navigate(path);
    close();
  }, [navigate, close, trackNavigation]);

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
                groups={groups}
                selectedIndex={selectedIndex}
                query={query}
                onSelect={handleSelect}
              />
            ) : (
              !aiMode && !hasActiveAction && (
                hasSuggestions ? (
                  <CommandSuggestionPanel
                    query={query}
                    suggestions={suggestions}
                    onNavigate={(path) => { trackNavigation(path); navigate(path); close(); }}
                    onQueryChange={setQuery}
                    onSwitchToAI={() => setAiMode(true)}
                  />
                ) : (
                  <div className="py-10 px-6 text-center">
                    <p className="font-sans text-sm text-muted-foreground">
                      No results for "<span className="text-foreground font-medium">{query}</span>"
                    </p>
                  </div>
                )
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
