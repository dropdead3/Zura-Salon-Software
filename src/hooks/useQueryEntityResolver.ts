/**
 * Resolves ParsedQuery entity candidates against live data.
 * Consumes team directory, service lookup, and navigation registry.
 */
import { useMemo } from 'react';
import type { ParsedQuery, EntityCandidate, EntityType } from '@/lib/queryParser';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useServiceLookup } from '@/hooks/useServiceLookup';
import {
  mainNavItems,
  myToolsNavItems,
  manageNavItems,
  systemNavItems,
} from '@/config/dashboardNav';

export interface ResolvedEntity extends EntityCandidate {
  resolvedId?: string;
  resolvedLabel?: string;
  resolvedMeta?: string;
}

export interface ResolvedQuery extends ParsedQuery {
  resolvedEntities: ResolvedEntity[];
  confidence: ParsedQuery['confidence'] & { entityResolution: number };
}

/** Substring/word-boundary scoring (same pattern as useCommandSearch). */
function scoreMatch(haystack: string, query: string): number {
  const lower = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  const idx = lower.indexOf(q);
  if (idx >= 0) return 60 - idx * 0.5;
  const words = lower.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 50;
  return 0;
}

// Build flat nav label list once
const ALL_NAV_LABELS = (() => {
  const seen = new Set<string>();
  const items: { label: string; href: string }[] = [];
  const add = (list: { label: string; href: string }[]) => {
    for (const item of list) {
      if (!seen.has(item.href)) {
        seen.add(item.href);
        items.push({ label: item.label, href: item.href });
      }
    }
  };
  add(mainNavItems as any[]);
  add(myToolsNavItems as any[]);
  add(manageNavItems as any[]);
  add(systemNavItems as any[]);
  return items;
})();

export function useQueryEntityResolver(parsed: ParsedQuery | null): ResolvedQuery | null {
  const { data: teamMembers } = useTeamDirectory();
  const { data: serviceLookup } = useServiceLookup();

  return useMemo(() => {
    if (!parsed) return null;

    const resolved: ResolvedEntity[] = [];
    let totalScore = 0;
    let resolvedCount = 0;

    for (const candidate of parsed.entities) {
      const q = candidate.value;
      let bestMatch: ResolvedEntity | null = null;
      let bestScore = 0;

      // Try team directory
      if (teamMembers && ['stylist', 'client'].includes(candidate.type)) {
        for (const member of teamMembers) {
          const name = member.full_name || member.display_name || '';
          if (!name) continue;
          const score = scoreMatch(name, q);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              ...candidate,
              type: 'stylist' as EntityType,
              resolvedId: member.user_id,
              resolvedLabel: name,
              resolvedMeta: member.roles?.[0] || undefined,
              confidence: Math.min(score / 100, 1),
            };
          }
        }
      }

      // Try services
      if (serviceLookup) {
        for (const [name, service] of serviceLookup) {
          const score = scoreMatch(name, q);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              ...candidate,
              type: 'service' as EntityType,
              resolvedId: name,
              resolvedLabel: name,
              resolvedMeta: service.category || undefined,
              confidence: Math.min(score / 100, 1),
            };
          }
        }
      }

      // Try navigation pages
      for (const nav of ALL_NAV_LABELS) {
        const score = scoreMatch(nav.label, q);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            ...candidate,
            type: 'page' as EntityType,
            resolvedId: nav.href,
            resolvedLabel: nav.label,
            confidence: Math.min(score / 100, 1),
          };
        }
      }

      if (bestMatch && bestScore > 20) {
        resolved.push(bestMatch);
        totalScore += bestMatch.confidence;
        resolvedCount++;
      } else {
        // Keep unresolved candidate
        resolved.push({ ...candidate });
      }
    }

    const entityResolution =
      parsed.entities.length > 0
        ? totalScore / parsed.entities.length
        : 0;

    return {
      ...parsed,
      resolvedEntities: resolved,
      confidence: {
        ...parsed.confidence,
        entityResolution,
        overall: Math.min(
          parsed.confidence.overall * 0.7 + entityResolution * 0.3,
          1
        ),
      },
    };
  }, [parsed, teamMembers, serviceLookup]);
}
