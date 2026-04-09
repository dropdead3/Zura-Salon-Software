/**
 * Zura Search Ranking Engine
 * Pure scoring, grouping, and suggestion generation.
 * No React, no side effects, no API calls.
 * Consumes ParsedQuery output from queryParser.ts.
 */
import type { ParsedQuery, IntentType } from '@/lib/queryParser';
import type { ResolvedQuery, ResolvedEntity } from '@/hooks/useQueryEntityResolver';

// ─── Types ───────────────────────────────────────────────────

export type RankedResultType =
  | 'navigation'
  | 'team'
  | 'client'
  | 'help'
  | 'action'
  | 'report'
  | 'utility';

export interface RelevanceSignals {
  textMatch: number;
  intentAlignment: number;
  entityConfidence: number;
  recency: number;
  frequency: number;
  roleRelevance: number;
  contextBoost: number;
}

export interface RankedResult {
  id: string;
  type: RankedResultType;
  title: string;
  subtitle?: string;
  path?: string;
  icon?: React.ReactNode;
  metadata?: string;
  score: number;
  signals: RelevanceSignals;
}

export interface RankedResultGroup {
  id: string;
  label: string;
  results: RankedResult[];
}

export interface SuggestionFallback {
  type: 'topic' | 'navigation' | 'query_correction';
  label: string;
  path?: string;
  query?: string;
}

// ─── Candidate (pre-scoring input) ──────────────────────────

export interface SearchCandidate {
  id: string;
  type: RankedResultType;
  title: string;
  subtitle?: string;
  path?: string;
  icon?: React.ReactNode;
  metadata?: string;
  /** Permission required — if user lacks it, candidate is filtered out pre-ranking. */
  permission?: string;
  /** Roles that can see this item. */
  roles?: string[];
}

// ─── Scoring Weights ─────────────────────────────────────────

const WEIGHTS = {
  textMatch: 0.25,
  intentAlignment: 0.25,
  entityConfidence: 0.15,
  recency: 0.10,
  frequency: 0.10,
  roleRelevance: 0.10,
  contextBoost: 0.05,
} as const;

function computeScore(signals: RelevanceSignals): number {
  return (
    signals.textMatch * WEIGHTS.textMatch +
    signals.intentAlignment * WEIGHTS.intentAlignment +
    signals.entityConfidence * WEIGHTS.entityConfidence +
    signals.recency * WEIGHTS.recency +
    signals.frequency * WEIGHTS.frequency +
    signals.roleRelevance * WEIGHTS.roleRelevance +
    signals.contextBoost * WEIGHTS.contextBoost
  );
}

// ─── Text Matching ───────────────────────────────────────────

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

// ─── Intent ↔ ResultType Alignment ──────────────────────────

const INTENT_TYPE_MAP: Record<IntentType, RankedResultType[]> = {
  entity_lookup: ['team', 'client'],
  navigation: ['navigation', 'utility', 'report'],
  analytics_query: ['report', 'navigation'],
  action_request: ['action'],
  help_query: ['help'],
  ambiguous: [],
};

function computeIntentAlignment(
  resultType: RankedResultType,
  intents: ParsedQuery['intents'],
): number {
  if (intents.length === 0) return 0.1;
  const topIntent = intents[0];
  const alignedTypes = INTENT_TYPE_MAP[topIntent.type] ?? [];
  if (alignedTypes.includes(resultType)) {
    return topIntent.confidence;
  }
  // Check secondary intents for partial alignment
  for (let i = 1; i < intents.length; i++) {
    const aligned = INTENT_TYPE_MAP[intents[i].type] ?? [];
    if (aligned.includes(resultType)) {
      return intents[i].confidence * 0.6;
    }
  }
  return 0.1;
}

// ─── Entity Confidence ──────────────────────────────────────

function computeEntityConfidence(
  candidateId: string,
  resolvedEntities: ResolvedEntity[],
): number {
  const match = resolvedEntities.find(
    (e) => e.resolvedId === candidateId || e.value?.toLowerCase() === candidateId.toLowerCase(),
  );
  return match?.confidence ?? 0;
}

// ─── Recency Signal ─────────────────────────────────────────

function computeRecency(
  path: string | undefined,
  recentPaths: string[],
): number {
  if (!path) return 0;
  const idx = recentPaths.indexOf(path);
  if (idx < 0) return 0;
  return Math.max(0, 1 - idx * 0.2);
}

// ─── Frequency Signal ───────────────────────────────────────

const FREQUENCY_STORAGE_KEY = 'zura-nav-frequency';
const FREQUENCY_NORMALIZE_CEILING = 20;

export function getFrequencyMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FREQUENCY_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function trackNavFrequency(path: string): void {
  try {
    const map = getFrequencyMap();
    map[path] = (map[path] || 0) + 1;
    localStorage.setItem(FREQUENCY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable
  }
}

function computeFrequency(
  path: string | undefined,
  frequencyMap: Record<string, number>,
): number {
  if (!path) return 0;
  const count = frequencyMap[path] || 0;
  return Math.min(count / FREQUENCY_NORMALIZE_CEILING, 1);
}

// ─── Role Relevance ─────────────────────────────────────────

function computeRoleRelevance(
  candidate: SearchCandidate,
  userPermissions: string[],
  userRoles: string[],
): number {
  // No restriction → neutral score
  if (!candidate.permission && (!candidate.roles || candidate.roles.length === 0)) {
    return 0.5;
  }
  // Has matching permission or role → full relevance
  const permOk = !candidate.permission || userPermissions.includes(candidate.permission);
  const rolesOk =
    !candidate.roles ||
    candidate.roles.length === 0 ||
    candidate.roles.some((r) => userRoles.includes(r));
  return permOk && rolesOk ? 1.0 : 0;
}

// ─── Context Boost ──────────────────────────────────────────

function computeContextBoost(
  resultPath: string | undefined,
  currentPath: string,
): number {
  if (!resultPath || !currentPath) return 0;
  if (resultPath === currentPath) return 0; // already there, no boost
  const resultSegments = resultPath.split('/').filter(Boolean);
  const currentSegments = currentPath.split('/').filter(Boolean);
  let shared = 0;
  for (let i = 0; i < Math.min(resultSegments.length, currentSegments.length); i++) {
    if (resultSegments[i] === currentSegments[i]) shared++;
    else break;
  }
  if (shared >= 2) return 0.6;
  if (shared === 1) return 0.3;
  return 0;
}

// ─── Permission Pre-Filter ─────────────────────────────────

export function filterByPermissions(
  candidates: SearchCandidate[],
  userPermissions: string[],
  userRoles: string[],
): SearchCandidate[] {
  return candidates.filter((c) => {
    if (c.permission && !userPermissions.includes(c.permission)) return false;
    if (c.roles && c.roles.length > 0 && !c.roles.some((r) => userRoles.includes(r))) return false;
    return true;
  });
}

// ─── Main Ranking ───────────────────────────────────────────

export interface RankingContext {
  query: string;
  parsed: ParsedQuery;
  resolved: ResolvedQuery | null;
  recentPaths: string[];
  frequencyMap: Record<string, number>;
  userPermissions: string[];
  userRoles: string[];
  currentPath: string;
}

export function rankResults(
  candidates: SearchCandidate[],
  ctx: RankingContext,
): RankedResult[] {
  const q = ctx.query.trim();
  if (!q) return [];

  const resolvedEntities = ctx.resolved?.resolvedEntities ?? [];
  const permitted = filterByPermissions(candidates, ctx.userPermissions, ctx.userRoles);

  const results: RankedResult[] = permitted.map((candidate) => {
    const textMatch = scoreMatch(candidate.title + ' ' + (candidate.subtitle || ''), q) / 100;
    const intentAlignment = computeIntentAlignment(candidate.type, ctx.parsed.intents);
    const entityConfidence = computeEntityConfidence(
      candidate.id,
      resolvedEntities,
    );
    const recency = computeRecency(candidate.path, ctx.recentPaths);
    const frequency = computeFrequency(candidate.path, ctx.frequencyMap);
    const roleRelevance = computeRoleRelevance(candidate, ctx.userPermissions, ctx.userRoles);
    const contextBoost = computeContextBoost(candidate.path, ctx.currentPath);

    const signals: RelevanceSignals = {
      textMatch,
      intentAlignment,
      entityConfidence,
      recency,
      frequency,
      roleRelevance,
      contextBoost,
    };

    // Hard rule: exact match override
    const isExact = candidate.title.toLowerCase() === q.toLowerCase();
    const score = isExact ? 1.0 : computeScore(signals);

    return {
      id: candidate.id,
      type: candidate.type,
      title: candidate.title,
      subtitle: candidate.subtitle,
      path: candidate.path,
      icon: candidate.icon,
      metadata: candidate.metadata,
      score,
      signals,
    };
  });

  // Filter zero text-match candidates (irrelevant results)
  const relevant = results.filter((r) => r.signals.textMatch > 0 || r.signals.entityConfidence > 0);

  // Sort: score desc, then alphabetical title, then type priority
  return relevant.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.title !== b.title) return a.title.localeCompare(b.title);
    return TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
  });
}

const TYPE_PRIORITY: Record<RankedResultType, number> = {
  navigation: 1,
  team: 2,
  client: 3,
  report: 4,
  utility: 5,
  help: 6,
  action: 7,
};

// ─── Grouping ───────────────────────────────────────────────

const GROUP_CONFIG: Record<
  string,
  { label: string; priority: number; maxItems?: number }
> = {
  best: { label: 'Top Results', priority: 0, maxItems: 3 },
  team: { label: 'Team', priority: 1 },
  client: { label: 'Clients', priority: 2 },
  navigation: { label: 'Pages & Features', priority: 3 },
  report: { label: 'Reports', priority: 4 },
  utility: { label: 'Utilities', priority: 5 },
  help: { label: 'Help & Resources', priority: 6 },
  action: { label: 'Suggested Actions', priority: 7 },
};

const TOP_RESULT_THRESHOLD = 0.4;
const MAX_TOTAL_RESULTS = 15;

export function groupRankedResults(results: RankedResult[]): RankedResultGroup[] {
  const capped = results.slice(0, MAX_TOTAL_RESULTS);
  const groups: RankedResultGroup[] = [];

  // Top Results: highest scores above threshold
  const bestMatch = capped
    .filter((r) => r.score >= TOP_RESULT_THRESHOLD)
    .slice(0, GROUP_CONFIG.best.maxItems!);

  if (bestMatch.length > 0) {
    groups.push({ id: 'best', label: GROUP_CONFIG.best.label, results: bestMatch });
  }

  // Remaining grouped by type
  const bestIds = new Set(bestMatch.map((r) => r.id));
  const rest = capped.filter((r) => !bestIds.has(r.id));

  const byType = new Map<RankedResultType, RankedResult[]>();
  rest.forEach((r) => {
    const arr = byType.get(r.type) || [];
    arr.push(r);
    byType.set(r.type, arr);
  });

  const typeEntries = Array.from(byType.entries()).sort(
    (a, b) => (GROUP_CONFIG[a[0]]?.priority ?? 99) - (GROUP_CONFIG[b[0]]?.priority ?? 99),
  );

  typeEntries.forEach(([type, items]) => {
    groups.push({
      id: type,
      label: GROUP_CONFIG[type]?.label ?? type,
      results: items,
    });
  });

  return groups;
}

// ─── Suggestion Fallbacks ───────────────────────────────────

const FALLBACK_NAV_SUGGESTIONS: SuggestionFallback[] = [
  { type: 'navigation', label: 'Browse Help Center', path: '/dashboard/help' },
  { type: 'navigation', label: 'View Team Directory', path: '/dashboard/directory' },
  { type: 'topic', label: 'Ask AI for help' },
];

export function generateSuggestions(
  parsed: ParsedQuery | null,
  currentPath: string,
): SuggestionFallback[] {
  if (!parsed) return FALLBACK_NAV_SUGGESTIONS;

  const suggestions: SuggestionFallback[] = [];
  const topIntent = parsed.intents[0]?.type;

  if (topIntent === 'help_query') {
    suggestions.push(
      { type: 'navigation', label: 'Browse Help Center', path: '/dashboard/help' },
      { type: 'topic', label: 'Ask AI for help' },
    );
  } else if (topIntent === 'entity_lookup') {
    suggestions.push(
      { type: 'navigation', label: 'Search Team Directory', path: '/dashboard/directory' },
      { type: 'navigation', label: 'Search Clients', path: '/dashboard/clients' },
    );
  } else if (topIntent === 'navigation' || topIntent === 'analytics_query') {
    suggestions.push(
      { type: 'navigation', label: 'View Analytics Hub', path: '/dashboard/admin/analytics' },
      { type: 'navigation', label: 'View All Reports', path: '/dashboard/admin/reports' },
    );
  }

  // Always add context-aware nearby page
  if (currentPath.includes('/admin/')) {
    suggestions.push({
      type: 'navigation',
      label: 'Back to Command Center',
      path: '/dashboard',
    });
  }

  // Always include AI fallback
  if (!suggestions.some((s) => s.label.includes('AI'))) {
    suggestions.push({ type: 'topic', label: 'Ask AI for help' });
  }

  return suggestions.slice(0, 4);
}
