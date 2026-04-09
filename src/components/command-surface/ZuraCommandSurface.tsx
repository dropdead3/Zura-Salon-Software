import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { classifyAndGround } from '@/lib/navGrounding';
import type { NavDestination } from '@/lib/navKnowledgeBase';
import { useActiveLocations } from '@/hooks/useLocations';
import { useSearchRanking } from '@/hooks/useSearchRanking';
import { useRecentSearches } from './useRecentSearches';
import { isQuestionQuery } from './commandTypes';
import { CommandInput } from './CommandInput';
import { CommandSearchFilters, detectScopePrefix } from './CommandSearchFilters';
import type { SearchScope } from './CommandSearchFilters';
import { CommandResultPanel } from './CommandResultPanel';
import { CommandAIAnswerCard } from './CommandAIAnswerCard';
import { CommandProactiveState } from './CommandProactiveState';
import { CommandSuggestionPanel } from './CommandSuggestionRow';
import { CommandNoResultsState } from './CommandNoResultsState';
import { useActionExecution } from '@/hooks/useActionExecution';
import { usePermission } from '@/hooks/usePermission';
import { CommandActionPanel } from './CommandActionPanel';
import { useSearchLearning } from '@/hooks/useSearchLearning';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useCommandPreview } from '@/hooks/useCommandPreview';
import { CommandPreviewPanel } from './CommandPreviewPanel';
import { CommandInlineAnalyticsCard, detectAnalyticsHint } from './CommandInlineAnalyticsCard';
import { useCommandDataQuery } from '@/hooks/useCommandDataQuery';
import { CommandChainBar } from './CommandChainBar';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useTypeahead } from '@/hooks/useTypeahead';
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
  anchorRef?: React.RefObject<HTMLElement>;
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

const SPRING_OPEN = { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.7 };
const SPRING_CLOSE = { type: 'spring' as const, damping: 32, stiffness: 400, mass: 0.6 };

export function ZuraCommandSurface({ open, onOpenChange, filterNavItems, anchorRef }: ZuraCommandSurfaceProps) {
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeScope, setActiveScope] = useState<SearchScope>('all');
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = usePermission();
  const effectiveRoles = useEffectiveRoles();
  const { dashPath } = useOrgDashboardPath();
  const lastQueryBeforeCloseRef = useRef('');
  const isMobile = useIsMobile();
  const { isImpersonating, effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const primaryRole = useMemo(() => {
    const ROLE_PRIORITY: string[] = ['super_admin', 'admin', 'manager', 'receptionist', 'stylist', 'stylist_assistant', 'operations_assistant', 'admin_assistant', 'bookkeeper', 'inventory_manager', 'booth_renter'];
    for (const r of ROLE_PRIORITY) {
      if (effectiveRoles.includes(r as any)) return r;
    }
    return effectiveRoles[0] ?? undefined;
  }, [effectiveRoles]);

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage, reset: resetAI } = useAIAssistant();
  const { recents, recentEntries, addRecent, clearRecents } = useRecentSearches(orgId);
  const actionExecution = useActionExecution();

  // Preview system
  const { activePreview, handleHover, handleHoverImmediate, clearPreview } = useCommandPreview(query);
  const hasPreview = !!activePreview;

  // Inline analytics hint
  const analyticsHint = useMemo(() => detectAnalyticsHint(query), [query]);

  // Memoize classifyAndGround to avoid redundant calls in JSX (Fix #1)
  const groundingResult = useMemo(() => {
    if (!query.trim()) return { isNavigation: false, verifiedDestinations: [] as NavDestination[], confidence: 'none' as const, groundingPrompt: '' };
    return classifyAndGround(query, primaryRole);
  }, [query, primaryRole]);

  // Location names for chain bar editable chips
  const { data: activeLocations } = useActiveLocations();
  const locationNames = useMemo(
    () => (activeLocations || []).map((l) => l.name),
    [activeLocations],
  );

  // Search Learning
  const learning = useSearchLearning(open, effectiveRoles as string[], location.pathname, orgId);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally refresh only when surface opens
  const decayedFreqMap = useMemo(() => learning.getDecayedFrequencyMap(), [open]);

  // Use the unified ranking hook
  const {
    groups,
    suggestions,
    parsedQuery,
    rankedResults,
    chainedQuery,
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

  // Scope-aware filtering
  const scopePrefix = useMemo(() => detectScopePrefix(query), [query]);
  const effectiveScope = scopePrefix?.scope ?? activeScope;
  const effectiveQuery = scopePrefix?.cleanQuery ?? query;

  const allFlatResults = useMemo(() => groups.flatMap(g => g.results), [groups]);

  const scopeTypeMap: Record<string, string[]> = useMemo(() => ({
    navigation: ['navigation', 'help'],
    team: ['team'],
    action: ['action'],
    client: ['client'],
    inventory: ['inventory'],
    task: ['task'],
    appointment: ['appointment'],
  }), []);

  const flatResults = useMemo(() => {
    if (effectiveScope === 'all') return allFlatResults;
    const allowed = scopeTypeMap[effectiveScope] || [];
    return allFlatResults.filter(r => allowed.includes(r.type));
  }, [allFlatResults, effectiveScope, scopeTypeMap]);

  // Build scope-filtered groups for the result panel (Fix #2 — keeps visual in sync with keyboard nav)
  const filteredGroups = useMemo(() => {
    if (effectiveScope === 'all') return groups;
    const allowed = scopeTypeMap[effectiveScope] || [];
    return groups
      .map(g => ({ ...g, results: g.results.filter(r => allowed.includes(r.type)) }))
      .filter(g => g.results.length > 0);
  }, [groups, effectiveScope, scopeTypeMap]);

  const hasResults = flatResults.length > 0;
  const hasQuery = query.trim().length > 0;
  const hasActiveAction = actionExecution.actionState !== 'idle';
  const hasSuggestions = suggestions.length > 0;

  // Typeahead vocabulary
  const typeaheadVocab = useMemo(() => {
    const labels: string[] = [];
    allFlatResults.forEach(r => labels.push(r.title));
    // Add nav labels from config
    [...mainNavItems, ...myToolsNavItems, ...manageNavItems, ...systemNavItems].forEach((item: any) => {
      if (item.label && !labels.includes(item.label)) labels.push(item.label);
    });
    hubChildrenItems.forEach((item: any) => {
      if (item.label && !labels.includes(item.label)) labels.push(item.label);
    });
    // Add recent queries
    recents.forEach(q => { if (!labels.includes(q)) labels.push(q); });
    return labels;
  }, [allFlatResults, recents]);

  const completion = useTypeahead(query, typeaheadVocab);

  // AI card: only show when explicitly in AI mode, OR question with no strong navigation match
  const showAICard = aiMode || (
    hasQuery &&
    isQuestionQuery(query) &&
    (!hasResults || rankedResults[0]?.score < 0.5)
  );

  // Update preview on keyboard navigation (stabilized — only react to index changes)
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const current = flatResults[selectedIndex];
    if (current && current.id !== prevSelectedRef.current) {
      prevSelectedRef.current = current.id;
      handleHoverImmediate(current);
    }
  }, [selectedIndex, flatResults, handleHoverImmediate]);

  // Detect actions from parsed query
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

  // Stabilize reset refs to avoid re-running cleanup on every render (Fix #7)
  const actionResetRef = useRef(actionExecution.reset);
  actionResetRef.current = actionExecution.reset;

  useEffect(() => {
    if (!open) {
      const lastQ = lastQueryBeforeCloseRef.current;
      if (lastQ.trim()) {
        const topScore = rankedResults.length > 0 ? rankedResults[0]?.score ?? null : null;
        learning.logAbandonment(lastQ, rankedResults.length, topScore);
      }
      setQuery('');
      setAiMode(false);
      setSelectedIndex(0);
      setActiveScope('all');
      resetAI();
      actionResetRef.current();
      clearPreview();
    }
  }, [open, resetAI, clearPreview]);

  // Auto-trigger AI mode for question queries with no strong nav match
  const autoAiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Clear any existing timer on every query/state change
    if (autoAiTimerRef.current) {
      clearTimeout(autoAiTimerRef.current);
      autoAiTimerRef.current = null;
    }

    // Guard conditions
    if (!open || aiMode || aiLoading || !hasQuery || query.trim().length < 8) return;
    if (!isQuestionQuery(query)) return;
    if (hasResults && rankedResults[0]?.score >= 0.35) return;

    autoAiTimerRef.current = setTimeout(() => {
      setAiMode(true);
      sendMessage(query, [], orgId, primaryRole, groundingResult.isNavigation ? { isNavigation: groundingResult.isNavigation, confidence: groundingResult.confidence, groundingPrompt: groundingResult.groundingPrompt } : undefined);
      addRecent({ query, resultType: 'help' });
    }, 800);

    return () => {
      if (autoAiTimerRef.current) {
        clearTimeout(autoAiTimerRef.current);
        autoAiTimerRef.current = null;
      }
    };
  }, [query, open, aiMode, aiLoading, hasQuery, hasResults, rankedResults, sendMessage, addRecent, primaryRole, orgId, groundingResult]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset selectedIndex on scope change (Fix #3)
  useEffect(() => {
    setSelectedIndex(0);
  }, [effectiveScope]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /** Resolve a candidate path through org-scoped dashPath */
  const resolveOrgPath = useCallback((rawPath: string): string => {
    if (rawPath.startsWith('/dashboard')) {
      const subpath = rawPath.slice('/dashboard'.length);
      return dashPath(subpath || '/');
    }
    return rawPath;
  }, [dashPath]);

  const handleSelect = useCallback((result: { path?: string; title?: string; type?: string }, index?: number) => {
    if (result.path) {
      if (query.trim()) addRecent({ query: query.trim(), selectedPath: result.path, selectedTitle: result.title, resultType: (result.type as any) ?? 'navigation' });
      const resolvedPath = resolveOrgPath(result.path);
      trackNavigation(result.path);

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
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      // ⌘↵ / Ctrl+Enter — run action if one is active (Fix #11)
      if (hasActiveAction && actionExecution.activeAction) {
        e.preventDefault();
        if (actionExecution.actionState === 'confirming') {
          actionExecution.confirm();
          close();
        } else if (actionExecution.actionState === 'input_needed') {
          actionExecution.submitInputs();
        }
      }
    } else if (e.key === 'Enter') {
      if ((aiMode || isQuestionQuery(query)) && query.trim()) {
        addRecent({ query: query.trim(), resultType: 'help' });
        sendMessage(query, [], orgId, primaryRole, groundingResult.isNavigation ? { isNavigation: groundingResult.isNavigation, confidence: groundingResult.confidence, groundingPrompt: groundingResult.groundingPrompt } : undefined);
      } else if (flatResults[selectedIndex]) {
        handleSelect(flatResults[selectedIndex]);
      } else if (hasQuery && !hasResults && selectedIndex === 0) {
        handleAIFallback();
      }
    }
  }, [query, aiMode, flatResults, selectedIndex, handleSelect, close, resetAI, sendMessage, addRecent, primaryRole, orgId, groundingResult, hasActiveAction, actionExecution]);

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

  const handleInlineAnalyticsNav = useCallback((path: string) => {
    const resolvedPath = resolveOrgPath(path);
    navigate(resolvedPath);
    close();
  }, [navigate, close, resolveOrgPath]);

  const handleAIFallback = useCallback(() => {
    setAiMode(true);
    if (query.trim()) {
      sendMessage(query, [], orgId, primaryRole, groundingResult.isNavigation ? { isNavigation: groundingResult.isNavigation, confidence: groundingResult.confidence, groundingPrompt: groundingResult.groundingPrompt } : undefined);
    }
  }, [query, sendMessage, orgId, primaryRole, groundingResult]);

  // God Mode bar offset
  const godModeOffset = isImpersonating ? 44 : 0;

  // Anchor measurement — position panel from search bar's DOM rect
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchorRef?.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setAnchorRect({ top: r.top, left: r.left, width: r.width });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, anchorRef]);

  // Fallback positioning if no anchor available
  const panelTop = isMobile ? godModeOffset : (anchorRect?.top ?? godModeOffset + 72);
  const panelLeft = anchorRect?.left ?? 0;
  const maxPanelWidth = anchorRect ? Math.min(hasPreview ? 1080 : 720, window.innerWidth - panelLeft - 16) : undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            style={{ zIndex: 190, top: godModeOffset > 0 ? `${godModeOffset}px` : undefined }}
            onClick={close}
          />

          {/* Command Surface Panel */}
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={SPRING_OPEN}
            className={cn(
              'fixed flex flex-col border border-border rounded-xl overflow-hidden',
              tokens.drawer.content,
              'shadow-[0_24px_64px_-16px_hsl(var(--foreground)/0.15)]',
              'transition-[max-width] duration-200 ease-out',
              hasPreview ? 'max-w-[1080px]' : 'max-w-[720px]',
              // Mobile: full-screen sheet
              isMobile && 'inset-0 max-w-none rounded-none border-0 max-h-none',
            )}
            style={{
              zIndex: 200,
              transformOrigin: 'top left',
              ...(!isMobile ? {
                top: `${panelTop}px`,
                left: `${panelLeft}px`,
                width: maxPanelWidth ? `${maxPanelWidth}px` : 'calc(100vw - 2rem)',
                maxHeight: `min(560px, calc(100vh - ${panelTop + 40}px))`,
              } : {
                top: `${godModeOffset}px`,
              }),
            }}
          >
            <span className="sr-only">Search</span>

            <CommandInput
              query={query}
              onQueryChange={setQuery}
              aiMode={aiMode}
              onAiModeToggle={() => { setAiMode(m => !m); resetAI(); }}
              onKeyDown={handleKeyDown}
              completion={completion}
            />

            {hasQuery && !aiMode && (
              <CommandSearchFilters
                activeScope={activeScope}
                onScopeChange={setActiveScope}
              />
            )}

            {chainedQuery && (
              <CommandChainBar
                chain={chainedQuery}
                query={query}
                aiMode={aiMode}
                hasActiveAction={hasActiveAction}
                locationNames={locationNames}
                onQueryChange={setQuery}
                onNavigate={(path) => {
                  const resolvedPath = resolveOrgPath(path);
                  navigate(resolvedPath);
                  close();
                }}
              />
            )}

            <div className="flex-1 min-h-0 flex">
              {/* Results column */}
              <div className={cn(
                'flex-1 min-w-0 overflow-y-auto',
                hasPreview && 'lg:max-w-[calc(100%-340px)]'
              )}>
                {hasQuery && showAICard && (
                <CommandAIAnswerCard
                    response={aiResponse}
                    isLoading={aiLoading}
                    error={aiError}
                    isNavQuestion={isQuestionQuery(query) && groundingResult.isNavigation}
                    navConfidence={groundingResult.confidence}
                    destinations={groundingResult.isNavigation ? groundingResult.verifiedDestinations : []}
                    onNavigate={(path) => {
                      const resolvedPath = resolveOrgPath(path);
                      navigate(resolvedPath);
                      close();
                    }}
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
                  hasActiveAction ? null : (
                    hasResults ? (
                      <>
                        {analyticsHint && (
                          <CommandInlineAnalyticsCard
                            hint={analyticsHint}
                            onNavigate={handleInlineAnalyticsNav}
                          />
                        )}
                        <CommandResultPanel
                          groups={filteredGroups}
                          selectedIndex={selectedIndex}
                          query={query}
                          isQuestion={isQuestionQuery(query)}
                          onSelect={handleSelect}
                          onHover={handleHover}
                        />
                      </>
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
                          <CommandNoResultsState
                            query={query}
                            chainedQuery={chainedQuery}
                            onAskZura={handleAIFallback}
                            isFocused={selectedIndex === 0}
                          />
                        )
                      )
                    )
                  )
                ) : (
                  <CommandProactiveState
                    recentSearches={recents}
                    recentEntries={recentEntries}
                    recentPages={recentPages}
                    onSearchSelect={handleRecentSearchSelect}
                    onPageSelect={handleRecentPageSelect}
                    onClearRecents={clearRecents}
                    onNavigate={(path) => {
                      const resolvedPath = resolveOrgPath(path);
                      navigate(resolvedPath);
                      close();
                    }}
                  />
                )}
              </div>

              {/* Preview panel — desktop only */}
              {hasPreview && hasQuery && hasResults && (
                <CommandPreviewPanel result={activePreview!} />
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
                ask Zura
              </span>
              {hasActiveAction && (
                <span className="flex items-center gap-1 ml-auto">
                  <kbd className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 font-mono text-[11px]">⌘↵</kbd>
                  run action
                </span>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
