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
  getFrequencyMap,
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
import { useRecentSearches } from '@/components/command-surface/useRecentSearches';
import { expandQuery, logSynonymTelemetry } from '@/lib/synonymRegistry';
import type { QueryExpansion } from '@/lib/synonymRegistry';
import { scoreMatchWithSynonyms } from '@/lib/textMatch';

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
}

// ─── Hook ───────────────────────────────────────────────────

export function useSearchRanking(
  query: string,
  options: UseSearchRankingOptions = {},
) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { data: teamMembers } = useTeamDirectory();
  const { recents } = useRecentSearches();

  // Parse query
  const parsed = useMemo((): ParsedQuery | null => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return null;
    return parseQuery(trimmed);
  }, [query]);

  // Resolve entities
  const resolved = useQueryEntityResolver(parsed);

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

    const frequencyMap = getFrequencyMap();

    const ranked = rankResults(candidates, {
      query: query.trim(),
      parsed,
      resolved,
      recentPaths,
      frequencyMap,
      userPermissions: options.permissions || [],
      userRoles: options.roles || [],
      currentPath,
    });

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
  }, [parsed, resolved, candidates, recentPaths, options.permissions, options.roles, currentPath, query]);

  // Navigation tracking callback
  const trackNavigation = useCallback((path: string) => {
    trackNavFrequency(path);
  }, []);

  return {
    rankedResults,
    groups,
    suggestions,
    parsedQuery: parsed,
    isAmbiguous,
    trackNavigation,
  };
}
