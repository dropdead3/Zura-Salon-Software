/**
 * Zura Search Ranking Hook
 * Orchestrates: parseQuery → synonymExpansion → useQueryEntityResolver → rankResults → groupRankedResults
 * Single consumption point for the command surface.
 */
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Sparkles,
  UserCircle,
  Package,
  CheckSquare,
  Calendar,
  Zap,
} from 'lucide-react';

import { parseQuery } from '@/lib/queryParser';
import type { ParsedQuery } from '@/lib/queryParser';
import { useQueryEntityResolver } from '@/hooks/useQueryEntityResolver';
import {
  rankResults,
  groupRankedResults,
  generateSuggestions,
} from '@/lib/searchRanker';
import type {
  RankedResult,
  RankedResultGroup,
  SuggestionFallback,
  SearchCandidate,
  QuickAction,
} from '@/lib/searchRanker';
import {
  mainNavItems,
  myToolsNavItems,
  manageNavItems,
  systemNavItems,
  hubChildrenItems,
} from '@/config/dashboardNav';
import type { DashboardNavItem } from '@/config/dashboardNav';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useTasks } from '@/hooks/useTasks';
import { getAllActions } from '@/lib/actionRegistry';
import { useActiveLocations } from '@/hooks/useLocations';
import { useRecentSearches } from '@/components/command-surface/useRecentSearches';
import {
  useClientSearchCandidates,
  useProductSearchCandidates,
  useAppointmentSearchCandidates,
} from '@/hooks/useCommandEntitySearch';
import { expandQuery, logSynonymTelemetry } from '@/lib/synonymRegistry';
import type { QueryExpansion } from '@/lib/synonymRegistry';
import { scoreMatchWithSynonyms } from '@/lib/textMatch';
import { assembleChain } from '@/lib/queryChainEngine';
import type { ChainedQuery } from '@/lib/queryChainEngine';
import { trackFrequencyTimestamp } from '@/lib/searchLearning';
import { NAV_DESTINATIONS } from '@/lib/navKnowledgeBase';

// ─── Help items ─────────────────────────────────────────────

const helpItems = [
  { label: 'Profile', path: '/dashboard/profile', icon: UserCircle },
  { label: 'Help Center', path: '/dashboard/help', icon: BookOpen },
  { label: 'Handbooks', path: '/dashboard/handbooks', icon: BookOpen, subtitle: 'Employee guides & resources' },
  { label: "What's New", path: '/dashboard/changelog', icon: Sparkles, subtitle: 'Latest updates & features' },
];

// ─── Build candidate list ───────────────────────────────────

function dedupeByHref<T extends { href: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (!map.has(item.href)) map.set(item.href, item);
  });
  return Array.from(map.values());
}

interface NavItemLike {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
}

function buildNavCandidates(
  filterFn?: (items: NavItemLike[]) => NavItemLike[],
): SearchCandidate[] {
  const combined = dedupeByHref([
    ...mainNavItems,
    ...myToolsNavItems,
    ...manageNavItems,
    ...systemNavItems,
    ...hubChildrenItems.map((h) => ({ ...h, icon: LayoutDashboard })),
  ] as NavItemLike[]);

  const filtered = filterFn ? filterFn(combined) : combined;

  return filtered.map((item) => {
    // Cross-reference navKnowledgeBase for richer searchText and quickActions
    const kbMatch = NAV_DESTINATIONS.find(d => d.path === item.href);
    const searchText = kbMatch
      ? [item.label, ...kbMatch.keywords].join(' ')
      : undefined;
    const quickActions: QuickAction[] | undefined = kbMatch?.tabs
      ? kbMatch.tabs.slice(0, 2).map(t => ({
          label: t.label,
          path: `${kbMatch.path}?tab=${t.id}`,
        }))
      : undefined;

    return {
      id: `nav-${item.href}`,
      type: 'navigation' as const,
      title: item.label,
      path: item.href,
      icon: item.icon
        ? React.createElement(item.icon, { className: 'w-4 h-4' })
        : undefined,
      permission: item.permission,
      roles: item.roles,
      searchText,
      quickActions,
    };
  });
}

function buildHelpCandidates(): SearchCandidate[] {
  return helpItems.map((item) => ({
    id: `help-${item.path}`,
    type: 'help' as const,
    title: item.label,
    subtitle: item.subtitle,
    path: item.path,
    icon: React.createElement(item.icon, { className: 'w-4 h-4' }),
  }));
}

// ─── Options ────────────────────────────────────────────────

export interface UseSearchRankingOptions {
  filterNavItems?: (items: NavItemLike[]) => NavItemLike[];
  permissions?: string[];
  roles?: string[];
  /** Learning hook instance — if provided, enables learned ranking boosts */
  learningBoostFn?: (query: string, candidatePath: string) => { queryPathBoost: number; decayedFrequency: number };
  /** Decayed frequency map — replaces raw getFrequencyMap() */
  decayedFrequencyMap?: Record<string, number>;
}

// ─── Hook ───────────────────────────────────────────────────

export function useSearchRanking(
  query: string,
  options: UseSearchRankingOptions = {},
) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { data: teamMembers } = useTeamDirectory();
  const { data: activeLocations } = useActiveLocations();
  const { tasks: taskItems } = useTasks();
  const { recents } = useRecentSearches();

  // Entity search candidates (lazy-loaded when query is active)
  const entityEnabled = query.trim().length >= 2;
  const clientCandidates = useClientSearchCandidates(entityEnabled);
  const productCandidates = useProductSearchCandidates(entityEnabled);
  const appointmentCandidates = useAppointmentSearchCandidates(entityEnabled);

  // Location names for chain engine
  const locationNames = useMemo(
    () => (activeLocations || []).map(l => l.name),
    [activeLocations],
  );

  // Parse query
  const parsed = useMemo((): ParsedQuery | null => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return null;
    return parseQuery(trimmed);
  }, [query]);

  // Resolve entities
  const resolved = useQueryEntityResolver(parsed);

  // Chain assembly (post-parser structured interpretation)
  const chained = useMemo((): ChainedQuery | null => {
    if (!parsed) return null;
    return assembleChain(parsed, locationNames);
  }, [parsed, locationNames]);

  // Build candidate pool (memoized)
  const candidates = useMemo((): SearchCandidate[] => {
    const navCandidates = buildNavCandidates(options.filterNavItems);
    const helpCands = buildHelpCandidates();

    // Team candidates from directory
    const teamCandidates: SearchCandidate[] = (teamMembers || [])
      .filter((m) => m.full_name || m.display_name)
      .map((member) => ({
        id: `team-${member.user_id}`,
        type: 'team' as const,
        title: member.full_name || member.display_name || '',
        subtitle: member.roles?.[0] || 'Team Member',
        path: `/dashboard/directory?search=${encodeURIComponent(member.full_name || member.display_name || '')}`,
        icon: React.createElement(Users, { className: 'w-4 h-4' }),
        metadata: (member as any).location_name || undefined,
      }));

    // Task candidates from user's tasks
    const taskCandidates: SearchCandidate[] = (taskItems || [])
      .slice(0, 50)
      .map((task) => ({
        id: `task-${task.id}`,
        type: 'task' as const,
        title: task.title,
        subtitle: task.is_completed ? 'Completed' : task.priority === 'high' ? 'High priority' : task.due_date ? `Due ${task.due_date}` : 'Open',
        path: '/dashboard/tasks',
        icon: React.createElement(CheckSquare, { className: 'w-4 h-4' }),
        metadata: task.priority,
      }));

    // Action candidates from the registry
    const actionCandidates: SearchCandidate[] = getAllActions()
      .filter((a) => a.id !== 'navigate_page')
      .map((action) => ({
        id: `action-${action.id}`,
        type: 'action' as const,
        title: action.label,
        subtitle: action.description,
        path: action.routeTemplate.split('?')[0] || action.routeTemplate,
        icon: React.createElement(Zap, { className: 'w-4 h-4' }),
        permission: action.permissions[0] || undefined,
      }));

    return [
      ...navCandidates, ...helpCands, ...teamCandidates, ...taskCandidates, ...actionCandidates,
      ...clientCandidates, ...productCandidates, ...appointmentCandidates,
    ];
  }, [options.filterNavItems, teamMembers, taskItems, clientCandidates, productCandidates, appointmentCandidates]);

  // Compute recent paths from search history
  const recentPaths = useMemo((): string[] => {
    return recents;
  }, [recents]);

  // Synonym expansion
  const expansion = useMemo((): QueryExpansion | null => {
    if (!parsed) return null;
    const topIntent = parsed.intents[0]?.type ?? null;
    return expandQuery(query.trim(), topIntent);
  }, [parsed, query]);

  // Track synonym telemetry as a side effect (not inside useMemo)
  const telemetryRef = useRef<{ query: string; logged: boolean }>({ query: '', logged: false });
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!expansion || trimmedQuery === telemetryRef.current.query) return;
    telemetryRef.current = { query: trimmedQuery, logged: false };

    if (expansion.aliasMatches.length > 0 || expansion.conceptMatches.length > 0) {
      logSynonymTelemetry({
        query: trimmedQuery,
        aliasesUsed: expansion.aliasMatches,
        conceptsActivated: expansion.conceptMatches.map((c) => c.clusterId),
        hadResults: false, // will be updated post-ranking — acceptable approximation
        timestamp: Date.now(),
      });
      telemetryRef.current.logged = true;
    }
  }, [expansion, query]);

  // Rank
  const { rankedResults, groups, suggestions, isAmbiguous } = useMemo(() => {
    if (!parsed) {
      return {
        rankedResults: [] as RankedResult[],
        groups: [] as RankedResultGroup[],
        suggestions: [] as SuggestionFallback[],
        isAmbiguous: false,
      };
    }

    // Use decayed frequency map if provided, else empty
    const frequencyMap = options.decayedFrequencyMap || {};
    const trimmedQuery = query.trim();

    // Start from candidates directly (removed dead enrichedCandidates no-op)
    let candidatesForRanking = candidates;

    // Pre-score candidates with synonym awareness to inject textMatch boosts
    if (expansion && expansion.expandedTerms.length > 0) {
      const bestAliasConfidence = expansion.aliasMatches.length > 0
        ? Math.max(...expansion.aliasMatches.map((a) => a.confidence))
        : 0.9;

      candidatesForRanking = candidates.map((c) => {
        const synResult = scoreMatchWithSynonyms(
          c.searchText || (c.title + ' ' + (c.subtitle || '')),
          trimmedQuery,
          expansion.expandedTerms,
          bestAliasConfidence,
        );

        if (synResult.matchedVia === 'alias' && synResult.matchedTerm && synResult.score > 0) {
          const existingSub = c.subtitle || '';
          const synonymHint = synResult.matchedTerm;
          if (!existingSub.toLowerCase().includes(synonymHint) &&
              !c.title.toLowerCase().includes(synonymHint)) {
            return { ...c, subtitle: existingSub ? `${existingSub} · ${synonymHint}` : synonymHint };
          }
        }
        return c;
      });
    }

    // Inject chained destination hint as a virtual high-priority candidate
    // Deduplicate: if an existing candidate shares the same base path, boost it instead
    if (chained?.destinationHint && chained.confidence >= 0.4) {
      const hint = chained.destinationHint;
      const hintBasePath = hint.path.split('?')[0];
      const existingMatch = candidatesForRanking.find(c =>
        c.path && c.path.split('?')[0] === hintBasePath,
      );

      if (existingMatch) {
        // Boost existing candidate with chain context subtitle
        candidatesForRanking = candidatesForRanking.map(c =>
          c === existingMatch
            ? { ...c, subtitle: hint.label + (c.subtitle ? ` · ${c.subtitle}` : '') }
            : c,
        );
      } else {
        candidatesForRanking = [
          {
            id: `chain-dest-${hint.path}`,
            type: 'navigation' as const,
            title: hint.label,
            subtitle: Object.entries(hint.params).map(([k, v]) => `${k}: ${v}`).join(' · '),
            path: hint.path,
            icon: React.createElement(LayoutDashboard, { className: 'w-4 h-4' }),
          },
          ...candidatesForRanking,
        ];
      }
    }

    let ranked = rankResults(candidatesForRanking, {
      query: trimmedQuery,
      parsed,
      resolved,
      recentPaths,
      frequencyMap,
      userPermissions: options.permissions || [],
      userRoles: options.roles || [],
      currentPath,
    });

    // Apply learning boosts (secondary, bounded, never overrides exact match)
    if (options.learningBoostFn) {
      const boostFn = options.learningBoostFn;
      ranked = ranked.map((r) => {
        if (!r.path || r.score >= 1.0) return r; // exact match — never touch
        const boost = boostFn(trimmedQuery, r.path);
        const learningAdd = Math.min(boost.queryPathBoost, 0.15);
        const newScore = Math.min(r.score + learningAdd, 0.99);
        return newScore > r.score ? { ...r, score: newScore } : r;
      }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.title.localeCompare(b.title);
      });
    }

    const grouped = groupRankedResults(ranked);

    const noResults = ranked.length === 0 || ranked[0]?.score < 0.3;
    const suggs = noResults ? generateSuggestions(parsed, currentPath) : [];

    const ambiguous = parsed.confidence.intentClarity < 0.2;

    return {
      rankedResults: ranked,
      groups: grouped,
      suggestions: suggs,
      isAmbiguous: ambiguous,
    };
  }, [parsed, resolved, candidates, recentPaths, options.permissions, options.roles, currentPath, query, expansion, chained, options.decayedFrequencyMap, options.learningBoostFn]);

  // Navigation tracking callback — uses decayed frequency system only
  const trackNavigation = useCallback((path: string) => {
    trackFrequencyTimestamp(path);
  }, []);

  return {
    rankedResults,
    groups,
    suggestions,
    parsedQuery: parsed,
    chainedQuery: chained,
    isAmbiguous,
    trackNavigation,
  };
}
