/**
 * Zura Synonym & Alias Intelligence System
 * Layered language mapping: exact aliases → concept clusters → typo tolerance.
 * Pure data + logic — no React, no side effects except telemetry logging.
 */
import type { IntentType } from '@/lib/queryParser';
import { levenshtein } from '@/lib/textMatch';
export { levenshtein } from '@/lib/textMatch';

// ─── Types ───────────────────────────────────────────────────

export interface AliasGroup {
  canonical: string;
  aliases: string[];
  /** If set, aliases only apply when intent matches one of these */
  contexts?: IntentType[];
}

export interface ConceptCluster {
  id: string;
  terms: string[];
  relatedPaths?: string[];
  /** 0–1 boost factor when concept activates (default 0.25) */
  boost: number;
}

export interface AliasMatch {
  original: string;
  canonical: string;
  matchType: 'exact_alias' | 'concept' | 'typo_correction';
  confidence: number;
}

export interface ConceptMatch {
  clusterId: string;
  matchedTerm: string;
  boost: number;
}

export interface QueryExpansion {
  expandedTerms: string[];
  aliasMatches: AliasMatch[];
  conceptMatches: ConceptMatch[];
}

export interface SynonymTelemetry {
  query: string;
  aliasesUsed: AliasMatch[];
  conceptsActivated: string[];
  hadResults: boolean;
  timestamp: number;
}

// ─── Layer 1: Exact Alias Registry ──────────────────────────

export const ALIAS_GROUPS: AliasGroup[] = [
  // Navigation / pages
  { canonical: 'schedule', aliases: ['calendar', 'bookings', 'appointments', 'agenda'] },
  { canonical: 'team chat', aliases: ['messages', 'messaging', 'inbox', 'chat', 'dm'] },
  { canonical: 'command center', aliases: ['dashboard', 'home', 'overview', 'main'] },
  { canonical: 'my pay', aliases: ['payroll', 'compensation', 'earnings', 'paycheck', 'wages'] },
  { canonical: 'analytics hub', aliases: ['analytics', 'data', 'numbers', 'insights', 'metrics'] },
  { canonical: 'operations hub', aliases: ['team management', 'manage team', 'staff management', 'hr'] },
  { canonical: 'training hub', aliases: ['training', 'education', 'learning', 'courses', 'onboarding'] },
  { canonical: 'client directory', aliases: ['clients', 'guest list', 'customers', 'client list'] },
  { canonical: 'team directory', aliases: ['staff list', 'employee list', 'team list', 'roster'] },
  { canonical: 'reports', aliases: ['reporting', 'report generator', 'report builder'] },
  { canonical: 'settings', aliases: ['preferences', 'config', 'configuration', 'setup'] },
  { canonical: 'help center', aliases: ['help', 'support', 'faq', 'documentation'] },

  // Roles & Controls Hub — permissions, access, invitations
  { canonical: 'roles & controls hub', aliases: [
    'permissions', 'role permissions', 'access control', 'user roles', 'roles',
    'invite staff', 'invite team member', 'invitations', 'manage roles',
    'roles hub', 'roles and controls', 'roles & permissions', 'access hub',
    'role management', 'team permissions', 'who has access', 'change permissions',
    'add team member', 'manage access',
  ]},

  // Entities
  { canonical: 'client', aliases: ['guest', 'customer', 'patron'] },
  { canonical: 'stylist', aliases: ['staff', 'employee', 'team member', 'provider', 'technician', 'barber'] },
  { canonical: 'appointment', aliases: ['booking', 'reservation', 'session', 'visit'] },
  { canonical: 'transaction', aliases: ['ticket', 'sale', 'checkout', 'receipt', 'purchase'] },
  { canonical: 'commission', aliases: ['payout', 'comp', 'commission rate'] },

  // Features
  { canonical: 'no show', aliases: ['no-show', 'missed', 'didn\'t show', 'absent', 'missed appointment'] },
  { canonical: 'waitlist', aliases: ['waiting list', 'walk-ins', 'walk in', 'standby'] },
  { canonical: 'leaderboard', aliases: ['rankings', 'competition', 'scoreboard', 'top performers'] },
  { canonical: 'rewards', aliases: ['incentives', 'perks', 'bonuses', 'prizes'] },
  { canonical: 'shift swaps', aliases: ['trade shifts', 'swap schedule', 'shift trade', 'cover shift'] },
  { canonical: 'color bar', aliases: ['color', 'mixing', 'formulas', 'color room', 'backroom'] },
  { canonical: 'campaigns', aliases: ['marketing', 'promotions', 'ads', 'advertising', 'email blast'] },
  { canonical: 'feedback', aliases: ['reviews', 'ratings', 'nps', 'survey', 'testimonials'] },
  { canonical: 'retention', aliases: ['loyalty', 'repeat clients', 'returning', 'client retention'] },
  { canonical: 'utilization', aliases: ['capacity', 'busy', 'availability', 'occupancy', 'fill rate'] },
  { canonical: 'headshots', aliases: ['photos', 'portraits', 'profile photos', 'team photos'] },
  { canonical: 'graduation', aliases: ['levels', 'level progress', 'advancement', 'promotion path', 'career path'] },
  { canonical: 'pto', aliases: ['time off', 'vacation', 'sick days', 'leave', 'days off'] },
  { canonical: 'announcements', aliases: ['news', 'updates', 'notices', 'bulletin'] },
  { canonical: 'recruiting', aliases: ['hiring', 'recruitment', 'job posting', 'open positions'] },
  { canonical: 'check-in', aliases: ['check in', 'arrival', 'front desk', 'reception', 'kiosk'] },

  // Intent-contextual aliases (only apply in specific intent contexts)
  {
    canonical: 'book',
    aliases: ['schedule', 'reserve', 'make appointment'],
    contexts: ['action_request'],
  },
  {
    canonical: 'refund',
    aliases: ['return', 'money back', 'credit back'],
    contexts: ['action_request'],
  },
];

// ─── Layer 2: Concept Clusters ──────────────────────────────

export const CONCEPT_CLUSTERS: ConceptCluster[] = [
  {
    id: 'money',
    terms: ['revenue', 'sales', 'transactions', 'tickets', 'commissions', 'payroll',
      'refunds', 'pricing', 'tips', 'discounts', 'retail', 'compensation', 'earnings',
      'paycheck', 'income', 'payout', 'deposit', 'billing'],
    relatedPaths: ['/dashboard/admin/sales', '/dashboard/admin/reports', '/dashboard/pay'],
    boost: 0.25,
  },
  {
    id: 'people',
    terms: ['clients', 'guests', 'stylists', 'staff', 'team', 'employees', 'directory',
      'headshots', 'roster', 'barbers', 'providers', 'technicians', 'customers'],
    relatedPaths: ['/dashboard/directory', '/dashboard/clients'],
    boost: 0.20,
  },
  {
    id: 'scheduling',
    terms: ['appointments', 'bookings', 'calendar', 'schedule', 'waitlist', 'availability',
      'no-shows', 'cancellations', 'sessions', 'reservations', 'walk-ins', 'agenda'],
    relatedPaths: ['/dashboard/schedule', '/dashboard/appointments-hub', '/dashboard/transactions'],
    boost: 0.25,
  },
  {
    id: 'performance',
    terms: ['kpi', 'metrics', 'analytics', 'stats', 'leaderboard', 'utilization',
      'retention', 'rebooking', 'benchmarks', 'scores', 'ratings', 'performance',
      'productivity', 'efficiency', 'fill rate'],
    relatedPaths: ['/dashboard/admin/analytics', '/dashboard/admin/operational-analytics'],
    boost: 0.20,
  },
  {
    id: 'growth',
    terms: ['training', 'graduation', 'levels', 'program', 'milestones', 'education',
      'courses', 'advancement', 'career', 'development', 'mentoring'],
    relatedPaths: ['/dashboard/admin/training-hub', '/dashboard/admin/graduation-tracker'],
    boost: 0.20,
  },
  {
    id: 'operations',
    terms: ['check-in', 'front desk', 'shift swaps', 'announcements', 'pto', 'time attendance',
      'kiosk', 'reception', 'day rate', 'opening', 'closing', 'duties'],
    relatedPaths: ['/dashboard/admin/pto', '/dashboard/admin/announcements'],
    boost: 0.20,
  },
  {
    id: 'marketing',
    terms: ['campaigns', 'seo', 'leads', 'promotions', 'ads', 'reengagement', 'email blast',
      'advertising', 'social media', 'outreach', 'newsletter'],
    relatedPaths: ['/dashboard/campaigns', '/dashboard/admin/seo-workshop', '/dashboard/admin/leads'],
    boost: 0.20,
  },
  {
    id: 'reports',
    terms: ['daily sales', 'staff kpi', 'tip analysis', 'client attrition', 'no-show report',
      'payroll summary', 'executive summary', 'end of month', 'product sales',
      'demand heatmap', 'gift cards', 'churn risk', 'service profitability'],
    relatedPaths: ['/dashboard/admin/reports'],
    boost: 0.20,
  },
  {
    id: 'admin',
    terms: ['settings', 'permissions', 'roles', 'access', 'feature flags', 'configuration',
      'preferences', 'security', 'audit', 'setup', 'invitations', 'role permissions',
      'access control', 'user roles', 'manage roles', 'invite staff'],
    relatedPaths: ['/dashboard/admin/settings', '/dashboard/admin/access-hub'],
    boost: 0.15,
  },
  {
    id: 'products',
    terms: ['retail', 'inventory', 'color bar', 'mixing', 'product sales', 'formulas',
      'supplies', 'stock', 'merchandise'],
    relatedPaths: ['/dashboard/admin/color-bar'],
    boost: 0.20,
  },
];

// ─── Lookup Maps (built once at module load) ────────────────

/** Maps every alias (lowercase) → canonical term */
const aliasToCanonical = new Map<string, { canonical: string; contexts?: IntentType[] }>();

/** Maps every canonical (lowercase) → all its aliases */
const canonicalToAliases = new Map<string, string[]>();

/** All known vocabulary terms for typo matching */
const allVocabulary: string[] = [];

function buildLookupMaps() {
  for (const group of ALIAS_GROUPS) {
    const canon = group.canonical.toLowerCase();
    canonicalToAliases.set(canon, group.aliases.map((a) => a.toLowerCase()));
    for (const alias of group.aliases) {
      aliasToCanonical.set(alias.toLowerCase(), {
        canonical: group.canonical,
        contexts: group.contexts,
      });
    }
    // Also map canonical to itself
    if (!aliasToCanonical.has(canon)) {
      aliasToCanonical.set(canon, { canonical: group.canonical, contexts: group.contexts });
    }
    allVocabulary.push(canon, ...group.aliases.map((a) => a.toLowerCase()));
  }
}

buildLookupMaps();

// ─── Core Lookup Functions ──────────────────────────────────

/**
 * Resolve a single term to its canonical form.
 * Returns null if no alias mapping exists.
 */
export function resolveAlias(
  term: string,
  intent?: IntentType | null,
): { canonical: string; confidence: number } | null {
  const lower = term.toLowerCase();
  const entry = aliasToCanonical.get(lower);
  if (!entry) return null;

  // If alias has context restriction and intent doesn't match, skip
  if (entry.contexts && intent && !entry.contexts.includes(intent)) {
    return null;
  }

  return {
    canonical: entry.canonical,
    confidence: 0.9,
  };
}

/**
 * Get all aliases for a canonical term.
 */
export function getAliasesFor(canonical: string): string[] {
  return canonicalToAliases.get(canonical.toLowerCase()) ?? [];
}

/**
 * Find which concept clusters a term belongs to.
 */
export function findConceptClusters(term: string): ConceptMatch[] {
  const lower = term.toLowerCase();
  const matches: ConceptMatch[] = [];
  for (const cluster of CONCEPT_CLUSTERS) {
    if (cluster.terms.some((t) => t.includes(lower) || lower.includes(t))) {
      matches.push({
        clusterId: cluster.id,
        matchedTerm: lower,
        boost: cluster.boost,
      });
    }
  }
  return matches;
}

// ─── Typo Tolerance ─────────────────────────────────────────

// levenshtein is now imported from @/lib/textMatch

/**
 * Find nearest vocabulary match within Levenshtein distance ≤ 2.
 * Returns null if no close match exists.
 */
export function findNearMatch(input: string): { match: string; distance: number } | null {
  const lower = input.toLowerCase();
  if (lower.length < 3) return null; // too short for typo correction

  let best: { match: string; distance: number } | null = null;

  for (const vocab of allVocabulary) {
    const dist = levenshtein(lower, vocab);
    if (dist <= 2 && dist > 0 && (!best || dist < best.distance)) {
      best = { match: vocab, distance: dist };
      if (dist === 1) break; // good enough
    }
  }

  return best;
}

// ─── Query Expansion ────────────────────────────────────────

/**
 * Expand a query using the synonym system.
 * This is the main entry point consumed by the ranking hook.
 */
export function expandQuery(
  query: string,
  topIntent: IntentType | null,
): QueryExpansion {
  const trimmed = query.toLowerCase().trim();
  if (!trimmed) return { expandedTerms: [], aliasMatches: [], conceptMatches: [] };
  const tokens = trimmed.split(/\s+/);
  const expandedTerms: string[] = [];
  const aliasMatches: AliasMatch[] = [];
  const conceptMatches: ConceptMatch[] = [];

  // Try the full query as a phrase first
  const fullAlias = resolveAlias(query.trim(), topIntent);
  if (fullAlias) {
    expandedTerms.push(fullAlias.canonical);
    // Also add all aliases of the canonical for broader matching
    const relatedAliases = getAliasesFor(fullAlias.canonical);
    expandedTerms.push(...relatedAliases);
    aliasMatches.push({
      original: query.trim(),
      canonical: fullAlias.canonical,
      matchType: 'exact_alias',
      confidence: fullAlias.confidence,
    });
  }

  // Try individual tokens
  for (const token of tokens) {
    if (token.length < 2) continue;

    // Check alias
    const alias = resolveAlias(token, topIntent);
    if (alias && !expandedTerms.includes(alias.canonical)) {
      expandedTerms.push(alias.canonical);
      const relatedAliases = getAliasesFor(alias.canonical);
      for (const ra of relatedAliases) {
        if (!expandedTerms.includes(ra)) expandedTerms.push(ra);
      }
      aliasMatches.push({
        original: token,
        canonical: alias.canonical,
        matchType: 'exact_alias',
        confidence: alias.confidence,
      });
    }

    // Check typo if no alias found
    if (!alias) {
      const near = findNearMatch(token);
      if (near) {
        const correctedAlias = resolveAlias(near.match, topIntent);
        const canonical = correctedAlias?.canonical ?? near.match;
        if (!expandedTerms.includes(canonical)) {
          expandedTerms.push(canonical);
        }
        aliasMatches.push({
          original: token,
          canonical,
          matchType: 'typo_correction',
          confidence: 0.6,
        });
      }
    }
  }

  // Concept cluster expansion — only when:
  // 1. Query has ≥ 2 tokens or no strong alias match found
  // 2. No alias match has confidence ≥ 0.8
  const hasStrongAlias = aliasMatches.some(
    (a) => a.matchType === 'exact_alias' && a.confidence >= 0.8,
  );
  const shouldExpandConcepts = !hasStrongAlias && (tokens.length >= 2 || aliasMatches.length === 0);

  if (shouldExpandConcepts) {
    for (const token of tokens) {
      const clusters = findConceptClusters(token);
      for (const cm of clusters) {
        if (!conceptMatches.some((c) => c.clusterId === cm.clusterId)) {
          conceptMatches.push(cm);
          // Add up to 5 terms from the cluster
          const cluster = CONCEPT_CLUSTERS.find((c) => c.id === cm.clusterId);
          if (cluster) {
            let added = 0;
            for (const term of cluster.terms) {
              if (added >= 5) break;
              if (!expandedTerms.includes(term) && term !== token) {
                expandedTerms.push(term);
                added++;
              }
            }
          }
        }
      }
    }
  }

  return { expandedTerms, aliasMatches, conceptMatches };
}

// ─── Telemetry ──────────────────────────────────────────────

const TELEMETRY_KEY = 'zura-synonym-telemetry';
const TELEMETRY_MAX = 100;

export function logSynonymTelemetry(entry: SynonymTelemetry): void {
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    const entries: SynonymTelemetry[] = raw ? JSON.parse(raw) : [];
    entries.push(entry);
    // Ring buffer — keep last N
    const trimmed = entries.slice(-TELEMETRY_MAX);
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable
  }
}

export function getSynonymTelemetry(): SynonymTelemetry[] {
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
