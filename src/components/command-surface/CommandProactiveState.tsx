import React from 'react';
import { Clock, ArrowRight, Zap, ChevronRight, Calendar, CheckSquare, TrendingUp, Plus, UserPlus, BarChart3, Settings, Shield, FileText, Users } from 'lucide-react';
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

const ACTION_ICON_BASE = 'w-4 h-4 text-primary/50 group-hover/row:text-primary/70 transition-colors duration-150';

const EXPANDED_ACTIONS = [
  { label: 'Create Appointment', icon: Plus, path: '/dashboard/schedule' },
  { label: 'Add Client', icon: UserPlus, path: '/dashboard/clients' },
  { label: 'Run Report', icon: BarChart3, path: '/dashboard/admin/analytics' },
  { label: 'View Today\'s Appointments', icon: Calendar, path: '/dashboard/schedule' },
  { label: 'Invite Team Member', icon: Users, path: '/dashboard/admin/team' },
  { label: 'Open Roles & Permissions', icon: Shield, path: '/dashboard/admin/team/roles' },
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'This Morning';
  if (hour < 17) return 'This Afternoon';
  return 'This Evening';
}

export const CommandProactiveState = React.forwardRef<HTMLDivElement, CommandProactiveStateProps>(function CommandProactiveState({
  recentSearches,
  recentEntries,
  recentPages,
  onSearchSelect,
  onPageSelect,
  onClearRecents,
  onNavigate,
}, ref) {
  const { quickPaths, attentionItems, recommendedActions } = useProactiveIntelligence();
  const isMobile = useIsMobile();

  const hasRecents = recentSearches.length > 0;
  const hasPages = recentPages.length > 0;
  const hasContinue = hasRecents || hasPages;
  const hasQuickPaths = quickPaths.length > 0;
  const hasAttention = !isMobile && attentionItems.length > 0;
  const hasProactiveActions = !isMobile && recommendedActions.length > 0;

  // Merge proactive actions with expanded defaults, deduplicate by label
  const allActions = React.useMemo(() => {
    const fromProactive = recommendedActions.map(a => ({
      label: a.action,
      icon: Zap,
      path: '/dashboard',
    }));
    const merged = [...fromProactive];
    const labels = new Set(merged.map(a => a.label.toLowerCase()));
    for (const fa of EXPANDED_ACTIONS) {
      if (!labels.has(fa.label.toLowerCase())) {
        merged.push(fa);
      }
      if (merged.length >= 5) break;
    }
    return merged.slice(0, 5);
  }, [recommendedActions]);

  const todayShortcuts = [
    { label: "Today's Schedule", icon: Calendar, path: '/dashboard/schedule' },
    { label: "Today's Tasks", icon: CheckSquare, path: '/dashboard/tasks' },
    { label: "Today's Revenue", icon: TrendingUp, path: '/dashboard/admin/analytics' },
  ];

  return (
    <div className="py-1">
      {/* ── 1. Actions (execution first) ──────────────────────────── */}
      <div>
        <div className="px-4 pt-2 pb-1">
          <span className={tokens.heading.subsection}>Actions</span>
        </div>
        {allActions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={cn(ROW_BASE, 'cursor-pointer')}
              tabIndex={-1}
            >
              <Icon className={ACTION_ICON_BASE} />
              <span className="font-sans text-sm text-muted-foreground flex-1 truncate">
                {item.label}
              </span>
              <span className="font-sans text-[10px] px-2 py-0.5 rounded-full shrink-0 bg-primary/10 text-primary border border-primary/20 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150">
                Run
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/row:text-muted-foreground/60 transition-colors duration-150 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* ── 2. Today ──────────────────────────────────────────────── */}
      <div>
        <div className="mx-4 border-t border-border/30 my-1" />
        <div className="px-4 pt-2 pb-1">
          <span className={tokens.heading.subsection}>{getTimeGreeting()}</span>
        </div>
        {todayShortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={ROW_BASE}
              tabIndex={-1}
            >
              <Icon className={ICON_BASE} />
              <span className="font-sans text-sm text-muted-foreground">{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/row:text-muted-foreground/60 transition-colors duration-150 shrink-0 ml-auto" />
            </button>
          );
        })}
      </div>

      {/* ── 3. Recent ─────────────────────────────────────────────── */}
      {hasContinue && (
        <div>
          <div className="mx-4 border-t border-border/30 my-1" />
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            <span className={tokens.heading.subsection}>Recent</span>
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

      {/* ── 4. Navigate ───────────────────────────────────────────── */}
      {hasQuickPaths && (
        <div>
          <div className="mx-4 border-t border-border/30 my-1" />
          <div className="px-4 pt-2 pb-1">
            <span className={tokens.heading.subsection}>Navigate</span>
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

      {/* ── 5. Needs Attention ────────────────────────────────────── */}
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
    </div>
  );
});
CommandProactiveState.displayName = 'CommandProactiveState';
