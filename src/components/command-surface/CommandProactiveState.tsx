import React from 'react';
import { Clock, ArrowRight, Search, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  useProactiveIntelligence,
  type QuickPath,
  type AttentionItem,
  type RecommendedAction,
} from '@/hooks/useProactiveIntelligence';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RecentSearch } from './useRecentSearches';

interface CommandProactiveStateProps {
  recentSearches: string[];
  recentEntries?: RecentSearch[];
  recentPages: Array<{ label: string; path: string }>;
  onSearchSelect: (query: string) => void;
  onPageSelect: (path: string) => void;
  onClearRecents: () => void;
  onNavigate: (path: string) => void;
}

const ROW_BASE =
  'group/row w-full flex items-center gap-3 px-4 h-10 text-left hover:bg-muted/60 transition-colors duration-150';

const ICON_BASE = 'w-4 h-4 text-muted-foreground/40 group-hover/row:text-muted-foreground transition-colors duration-150';

export function CommandProactiveState({
  recentSearches,
  recentEntries,
  recentPages,
  onSearchSelect,
  onPageSelect,
  onClearRecents,
  onNavigate,
}: CommandProactiveStateProps) {
  const { quickPaths, attentionItems, recommendedActions } = useProactiveIntelligence();
  const isMobile = useIsMobile();

  const hasRecents = recentSearches.length > 0;
  const hasPages = recentPages.length > 0;
  const hasContinue = hasRecents || hasPages;
  const hasQuickPaths = quickPaths.length > 0;
  const hasAttention = !isMobile && attentionItems.length > 0;
  const hasActions = !isMobile && recommendedActions.length > 0;

  // Absolute fallback
  if (!hasContinue && !hasQuickPaths && !hasAttention && !hasActions) {
    return (
      <div className="py-10 px-6 text-center">
        <Search className="w-6 h-6 mx-auto mb-3 text-muted-foreground/15" />
        <p className="font-sans text-sm text-muted-foreground">
          Search or ask Zura...
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* ── Continue ───────────────────────────────────────────────── */}
      {hasContinue && (
        <div>
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            <span className={tokens.heading.subsection}>Continue</span>
            {hasRecents && (
              <button
                type="button"
                onClick={onClearRecents}
                className="font-sans text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-150"
                tabIndex={-1}
              >
                Clear
              </button>
            )}
          </div>
          {(recentEntries ?? recentSearches.map(q => ({ query: q, timestamp: Date.now() } as RecentSearch))).map((entry) => {
            const label = entry.selectedTitle || entry.query;
            const subtitle = entry.selectedTitle ? entry.query : undefined;
            return (
              <button
                key={entry.query}
                type="button"
                onClick={() => onSearchSelect(entry.query)}
                className={ROW_BASE}
                tabIndex={-1}
              >
                <Clock className={ICON_BASE} />
                <span className="font-sans text-sm text-muted-foreground truncate">{label}</span>
                {subtitle && (
                  <span className="font-sans text-xs text-muted-foreground/40 truncate ml-auto">{subtitle}</span>
                )}
              </button>
            );
          })}
          {recentPages.map((page) => (
            <button
              key={page.path}
              type="button"
              onClick={() => onPageSelect(page.path)}
              className={ROW_BASE}
              tabIndex={-1}
            >
              <ArrowRight className={ICON_BASE} />
              <span className="font-sans text-sm text-muted-foreground">{page.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Quick Paths ───────────────────────────────────────────── */}
      {hasQuickPaths && (
        <div>
          {hasContinue && <div className="mx-4 border-t border-border/30 my-1" />}
          <div className="px-4 pt-2 pb-1">
            <span className={tokens.heading.subsection}>Quick Paths</span>
          </div>
          {quickPaths.map((qp) => {
            const Icon = qp.icon;
            return (
              <button
                key={qp.href}
                type="button"
                onClick={() => onNavigate(qp.href)}
                className={ROW_BASE}
                tabIndex={-1}
              >
                <Icon className={ICON_BASE} />
                <span className="font-sans text-sm text-muted-foreground">{qp.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Attention ─────────────────────────────────────────────── */}
      {hasAttention && (
        <div>
          <div className="mx-4 border-t border-border/30 my-1" />
          <div className="px-4 pt-2 pb-1">
            <span className={tokens.heading.subsection}>Needs Attention</span>
          </div>
          {attentionItems.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => item.destinationHint && onNavigate(item.destinationHint)}
              className={cn(ROW_BASE, !item.destinationHint && 'cursor-default')}
              tabIndex={-1}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  item.severity === 'critical'
                    ? 'bg-red-500/60'
                    : 'bg-yellow-500/60',
                )}
              />
              <span className="font-sans text-sm text-muted-foreground flex-1 truncate">
                {item.title}
              </span>
              {item.destinationHint && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/row:text-muted-foreground/60 transition-colors duration-150 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Suggested ─────────────────────────────────────────────── */}
      {hasActions && (
        <div>
          {!hasAttention && (hasContinue || hasQuickPaths) && (
            <div className="mx-4 border-t border-border/30 my-1" />
          )}
          {hasAttention ? null : null}
          <div className="px-4 pt-2 pb-1">
            <span className={tokens.heading.subsection}>Suggested</span>
          </div>
          {recommendedActions.map((a, i) => (
            <div
              key={i}
              className={cn(ROW_BASE, 'cursor-default')}
            >
              <Zap className={cn(ICON_BASE, 'w-3.5 h-3.5')} />
              <span className="font-sans text-sm text-muted-foreground flex-1 truncate">
                {a.action}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
