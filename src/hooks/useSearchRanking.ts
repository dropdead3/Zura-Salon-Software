/**
 * Zura Search Ranking Hook
 * Orchestrates: parseQuery → synonymExpansion → useQueryEntityResolver → rankResults → groupRankedResults
 * Single consumption point for the command surface.
 */
import { useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Sparkles,
  UserCircle,
} from 'lucide-react';

import { parseQuery } from '@/lib/queryParser';
import type { ParsedQuery } from '@/lib/queryParser';
import { useQueryEntityResolver } from '@/hooks/useQueryEntityResolver';
import {
  rankResults,
  groupRankedResults,
  generateSuggestions,
  trackNavFrequency,
} from '@/lib/searchRanker';
import type {
  RankedResult,
  RankedResultGroup,
  SuggestionFallback,
  SearchCandidate,
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
import { useActiveLocations } from '@/hooks/useLocations';
import { useRecentSearches } from '@/components/command-surface/useRecentSearches';
import { expandQuery, logSynonymTelemetry } from '@/lib/synonymRegistry';
import type { QueryExpansion } from '@/lib/synonymRegistry';
import { scoreMatchWithSynonyms } from '@/lib/textMatch';
import { assembleChain } from '@/lib/queryChainEngine';
import type { ChainedQuery } from '@/lib/queryChainEngine';

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

  return filtered.map((item) => ({
    id: `nav-${item.href}`,
    type: 'navigation' as const,
    title: item.label,
    path: item.href,
    icon: item.icon
      ? React.createElement(item.icon, { className: 'w-4 h-4' })
      : undefined,
    permission: item.permission,
    roles: item.roles,
  }));
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
  const { recents } = useRecentSearches();

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

    return [...navCandidates, ...helpCands, ...teamCandidates];
  }, [options.filterNavItems, teamMembers]);

  // Compute recent paths from search history
  const recentPaths = useMemo((): string[] => {
    // Recent searches don't directly map to paths — use frequency map keys sorted by count
    return recents;
  }, [recents]);

  // Synonym expansion
  const expansion = useMemo((): QueryExpansion | null => {
    if (!parsed) return null;
    const topIntent = parsed.intents[0]?.type ?? null;
    return expandQuery(query.trim(), topIntent);
  }, [parsed, query]);

  // Inject synonym-boosted virtual candidates
  const enrichedCandidates = useMemo((): SearchCandidate[] => {
    if (!expansion || expansion.expandedTerms.length === 0) return candidates;

    // For each expanded term, check if any existing candidate title matches.
    // If a strong alias exists but no candidate matches it, we don't create new candidates
    // (we rely on synonym-aware scoring instead). This keeps candidate pool clean.
    return candidates;
  }, [candidates, expansion]);

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

    // Use decayed frequency map if provided, else fall back to raw ranker frequency
    const frequencyMap = options.decayedFrequencyMap || {};
    const trimmedQuery = query.trim();

    // If we have synonym expansion, boost candidates that match expanded terms
    let candidatesForRanking = enrichedCandidates;

    // Pre-score candidates with synonym awareness to inject textMatch boosts
    if (expansion && expansion.expandedTerms.length > 0) {
      const bestAliasConfidence = expansion.aliasMatches.length > 0
        ? Math.max(...expansion.aliasMatches.map((a) => a.confidence))
        : 0.9;

      // Add subtitle hints for candidates that match via synonyms
      // This lets the ranker's textMatch pick them up via subtitle matching
      candidatesForRanking = enrichedCandidates.map((c) => {
        const synResult = scoreMatchWithSynonyms(
          c.title + ' ' + (c.subtitle || ''),
          trimmedQuery,
          expansion.expandedTerms,
          bestAliasConfidence,
        );

        if (synResult.matchedVia === 'alias' && synResult.matchedTerm && synResult.score > 0) {
          // Inject the matched synonym into subtitle so ranker's textMatch finds it
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
    if (chained?.destinationHint && chained.confidence >= 0.4) {
      const hint = chained.destinationHint;
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

    // Log synonym telemetry
    if (expansion && (expansion.aliasMatches.length > 0 || expansion.conceptMatches.length > 0)) {
      logSynonymTelemetry({
        query: trimmedQuery,
        aliasesUsed: expansion.aliasMatches,
        conceptsActivated: expansion.conceptMatches.map((c) => c.clusterId),
        hadResults: ranked.length > 0 && ranked[0]?.score >= 0.3,
        timestamp: Date.now(),
      });
    }

    return {
      rankedResults: ranked,
      groups: grouped,
      suggestions: suggs,
      isAmbiguous: ambiguous,
    };
  }, [parsed, resolved, enrichedCandidates, recentPaths, options.permissions, options.roles, currentPath, query, expansion, chained]);

  // Navigation tracking callback
  const trackNavigation = useCallback((path: string) => {
    trackNavFrequency(path);
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
