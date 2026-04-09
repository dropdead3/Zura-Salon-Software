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
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
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
  const { dashPath } = useOrgDashboardPath();
  const lastQueryBeforeCloseRef = useRef('');

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage, reset: resetAI } = useAIAssistant();
  const { recents, addRecent, clearRecents } = useRecentSearches();
  const actionExecution = useActionExecution();

  // Search Learning
  const learning = useSearchLearning(open, effectiveRoles as string[], location.pathname);
  const decayedFreqMap = useMemo(() => learning.getDecayedFrequencyMap(), [open]);

  // Use the unified ranking hook — pass effectiveRoles for permission filtering
  const {
    groups,
    suggestions,
    parsedQuery,
    rankedResults,
    trackNavigation,
  } = useSearchRanking(query, {
    filterNavItems: filterNavItems as any,
    permissions,
    roles: effectiveRoles as string[],
    learningBoostFn: learning.getLearningBoosts,
    decayedFrequencyMap: decayedFreqMap,
  });

  // Derive recent pages from decayed frequency map
  const recentPages = useMemo(() => {
    return Object.entries(decayedFreqMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path]) => ({
        label: NAV_LABEL_MAP.get(path) || path.split('/').pop() || path,
        path,
      }));
  }, [decayedFreqMap]);

  const flatResults = useMemo(() => groups.flatMap(g => g.results), [groups]);
  const hasResults = flatResults.length > 0;
  const hasQuery = query.trim().length > 0;
  const hasActiveAction = actionExecution.actionState !== 'idle';
  const hasSuggestions = suggestions.length > 0;

  // AI card: only show when explicitly in AI mode, OR question with no strong navigation match
  const showAICard = aiMode || (
    hasQuery &&
    isQuestionQuery(query) &&
    (!hasResults || rankedResults[0]?.score < 0.5)
  );

  // Detect actions from parsed query (uses ranking pipeline output — no double-parse)
  useEffect(() => {
    if (hasQuery && !aiMode && parsedQuery?.actionIntent) {
      actionExecution.detectAndPrepare(parsedQuery, permissions);
    } else if (!hasQuery || aiMode) {
      actionExecution.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedQuery, aiMode, permissions, hasQuery]);

  // Track query for abandonment detection on close
  useEffect(() => {
    if (open) {
      lastQueryBeforeCloseRef.current = '';
    }
  }, [open]);

  useEffect(() => {
    lastQueryBeforeCloseRef.current = query;
  }, [query]);

  useEffect(() => {
    if (!open) {
      // Log abandonment if user had a query but didn't select
      const lastQ = lastQueryBeforeCloseRef.current;
      if (lastQ.trim()) {
        const topScore = rankedResults.length > 0 ? rankedResults[0]?.score ?? null : null;
        learning.logAbandonment(lastQ, rankedResults.length, topScore);
      }
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

  /** Resolve a candidate path through org-scoped dashPath */
  const resolveOrgPath = useCallback((rawPath: string): string => {
    // If path starts with /dashboard, resolve through dashPath
    if (rawPath.startsWith('/dashboard')) {
      const subpath = rawPath.slice('/dashboard'.length); // e.g., '/admin/analytics' or '?search=...'
      return dashPath(subpath || '/');
    }
    return rawPath;
  }, [dashPath]);

  const handleSelect = useCallback((result: { path?: string; title?: string }, index?: number) => {
    if (result.path) {
      if (query.trim()) addRecent(query.trim());
      const resolvedPath = resolveOrgPath(result.path);
      trackNavigation(result.path); // Track with canonical path for consistency

      // Log selection for learning
      const rank = index ?? flatResults.findIndex(r => r.path === result.path);
      const topScore = rankedResults.length > 0 ? rankedResults[0]?.score ?? 0 : 0;
      const selectedResult = flatResults.find(r => r.path === result.path);
      learning.logSelection(
        query,
        result.path,
        rank >= 0 ? rank : 0,
        (selectedResult?.type as any) ?? 'navigation',
        flatResults.length,
        topScore,
      );

      // Clear the query ref so close effect doesn't log abandonment
      lastQueryBeforeCloseRef.current = '';

      navigate(resolvedPath);
      close();
    }
  }, [navigate, close, query, addRecent, trackNavigation, flatResults, rankedResults, learning, resolveOrgPath]);

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
    const resolvedPath = resolveOrgPath(path);
    trackNavigation(path);
    navigate(resolvedPath);
    close();
  }, [navigate, close, trackNavigation, resolveOrgPath]);

  const handleSuggestionNavigate = useCallback((path: string) => {
    const resolvedPath = resolveOrgPath(path);
    trackNavigation(path);
    navigate(resolvedPath);
    close();
  }, [navigate, close, trackNavigation, resolveOrgPath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          'p-0 gap-0 border-border',
          tokens.drawer.content,
          'rounded-xl max-w-[720px] w-[calc(100vw-2rem)]',
          'max-h-[min(600px,80vh)]',
          'flex flex-col',
          'top-[35%] translate-y-[-35%]',
          'shadow-[0_24px_64px_-16px_hsl(var(--foreground)/0.15)]',
          'max-sm:max-w-none max-sm:w-screen max-sm:h-screen max-sm:max-h-screen max-sm:rounded-none max-sm:border-0 max-sm:top-[50%] max-sm:translate-y-[-50%]'
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
            // When action panel is active, suppress results to avoid visual confusion
            hasActiveAction ? null : (
              hasResults ? (
                <CommandResultPanel
                  groups={groups}
                  selectedIndex={selectedIndex}
                  query={query}
                  onSelect={handleSelect}
                />
              ) : (
                !aiMode && (
                  hasSuggestions ? (
                    <CommandSuggestionPanel
                      query={query}
                      suggestions={suggestions}
                      onNavigate={handleSuggestionNavigate}
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
            <kbd className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 font-mono text-[11px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 font-mono text-[11px]">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 font-mono text-[11px]">Tab</kbd>
            AI mode
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
