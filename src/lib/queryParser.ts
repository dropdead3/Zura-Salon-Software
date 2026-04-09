/**
 * Zura Query Parsing Engine
 * Pure functions — no React, no side effects, no API calls.
 * Translates raw search input into structured, machine-readable intent.
 */
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  subWeeks,
  format,
} from 'date-fns';
import { isQuestionQuery } from '@/components/command-surface/commandTypes';
import { AVAILABLE_METRICS } from '@/lib/reportMetrics';

// ─── Types ───────────────────────────────────────────────────

export type IntentType =
  | 'entity_lookup'
  | 'navigation'
  | 'analytics_query'
  | 'action_request'
  | 'help_query'
  | 'ambiguous';

export type EntityType =
  | 'client'
  | 'stylist'
  | 'service'
  | 'product'
  | 'transaction'
  | 'page';

export type TokenType =
  | 'time'
  | 'action'
  | 'filter'
  | 'metric'
  | 'entity_candidate'
  | 'unknown';

export interface Token {
  raw: string;
  normalized: string;
  type: TokenType;
  startIndex: number;
}

export interface ScoredIntent {
  type: IntentType;
  confidence: number;
}

export interface EntityCandidate {
  type: EntityType;
  value: string;
  confidence: number;
}

export interface TimeContext {
  type: 'relative' | 'absolute';
  value: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface ActionIntent {
  type: string;
  target?: string;
  confidence: number;
}

export interface ParsedQuery {
  raw: string;
  tokens: Token[];
  intents: ScoredIntent[];
  entities: EntityCandidate[];
  filters: Record<string, any>;
  timeContext: TimeContext | null;
  actionIntent: ActionIntent | null;
  confidence: {
    overall: number;
    intentClarity: number;
    entityResolution: number;
    timeResolution: number;
  };
  remainingTokens: string[];
}

// ─── Vocabularies ────────────────────────────────────────────

/** Sorted longest-first for greedy matching. */
const TIME_PHRASES: { phrase: string; key: string; label: string }[] = [
  { phrase: 'last 90 days', key: '90d', label: 'Last 90 Days' },
  { phrase: 'last 30 days', key: '30d', label: 'Last 30 Days' },
  { phrase: 'last 7 days', key: '7d', label: 'Last 7 Days' },
  { phrase: 'year to date', key: 'ytd', label: 'Year to Date' },
  { phrase: 'last month', key: 'lastMonth', label: 'Last Month' },
  { phrase: 'this month', key: 'thisMonth', label: 'Month to Date' },
  { phrase: 'last week', key: 'lastWeek', label: 'Last Week' },
  { phrase: 'this week', key: 'thisWeek', label: 'Week to Date' },
  { phrase: 'last year', key: 'lastYear', label: 'Last Year' },
  { phrase: 'yesterday', key: 'yesterday', label: 'Yesterday' },
  { phrase: 'today', key: 'today', label: 'Today' },
  { phrase: 'ytd', key: 'ytd', label: 'Year to Date' },
  { phrase: 'q1', key: 'q1', label: 'Q1' },
  { phrase: 'q2', key: 'q2', label: 'Q2' },
  { phrase: 'q3', key: 'q3', label: 'Q3' },
  { phrase: 'q4', key: 'q4', label: 'Q4' },
];

/** Multi-word action phrases sorted longest-first. */
const ACTION_PHRASES: { phrase: string; canonical: string }[] = [
  { phrase: 'check in', canonical: 'check_in' },
  { phrase: 'clock in', canonical: 'clock_in' },
  { phrase: 'clock out', canonical: 'clock_out' },
];

const ACTION_VERBS: Record<string, string> = {
  add: 'create',
  create: 'create',
  new: 'create',
  book: 'book',
  schedule: 'book',
  cancel: 'cancel',
  refund: 'refund',
  message: 'message',
  text: 'message',
  email: 'email',
  send: 'send',
  edit: 'edit',
  update: 'edit',
  delete: 'delete',
  remove: 'delete',
  assign: 'assign',
  transfer: 'transfer',
};

/** Multi-word filter phrases sorted longest-first. */
const FILTER_PHRASES: { phrase: string; filter: Record<string, any> }[] = [
  { phrase: 'no shows', filter: { status: 'no_show' } },
  { phrase: 'no show', filter: { status: 'no_show' } },
  { phrase: 'new clients', filter: { client_type: 'new' } },
  { phrase: 'new client', filter: { client_type: 'new' } },
  { phrase: 'returning clients', filter: { client_type: 'returning' } },
  { phrase: 'returning client', filter: { client_type: 'returning' } },
];

const FILTER_KEYWORDS: Record<string, Record<string, any>> = {
  cancelled: { status: 'cancelled' },
  active: { status: 'active' },
  inactive: { status: 'inactive' },
  overdue: { status: 'overdue' },
  pending: { status: 'pending' },
  top: { rank: 'top' },
  bottom: { rank: 'bottom' },
};

/** Build metric vocabulary from AVAILABLE_METRICS at module load. */
const METRIC_WORDS = new Set<string>();
AVAILABLE_METRICS.forEach((m) => {
  m.label
    .toLowerCase()
    .split(/\s+/)
    .forEach((w) => {
      if (w.length > 2) METRIC_WORDS.add(w);
    });
  METRIC_WORDS.add(m.category.toLowerCase());
});
// Additional common synonyms
['revenue', 'sales', 'retail', 'service', 'appointments', 'cancellations',
  'utilization', 'retention', 'rebooking', 'ticket', 'performance', 'analytics',
  'reports', 'metrics', 'kpi', 'kpis'].forEach((w) => METRIC_WORDS.add(w));

/** Action target nouns → canonical entity types for action mapping. */
const TARGET_NOUNS: Record<string, string> = {
  client: 'client',
  clients: 'client',
  appointment: 'appointment',
  appointments: 'appointment',
  booking: 'appointment',
  transaction: 'transaction',
  service: 'service',
  product: 'product',
  stylist: 'stylist',
  staff: 'stylist',
  member: 'stylist',
  meeting: 'meeting',
};

// ─── Step 1: Tokenization ────────────────────────────────────

function tokenize(input: string): { tokens: Token[]; consumed: Map<string, TokenType> } {
  const lower = input.toLowerCase();
  const tokens: Token[] = [];
  const consumed = new Map<string, TokenType>();

  // Track which character indices are consumed by multi-word phrases
  const charConsumed = new Array(lower.length).fill(false);

  // Greedy multi-word: time phrases first
  for (const tp of TIME_PHRASES) {
    const idx = lower.indexOf(tp.phrase);
    if (idx >= 0) {
      const alreadyConsumed = charConsumed.slice(idx, idx + tp.phrase.length).some(Boolean);
      if (!alreadyConsumed) {
        tokens.push({
          raw: input.slice(idx, idx + tp.phrase.length),
          normalized: tp.phrase,
          type: 'time',
          startIndex: idx,
        });
        for (let i = idx; i < idx + tp.phrase.length; i++) charConsumed[i] = true;
        consumed.set(tp.phrase, 'time');
      }
    }
  }

  // Multi-word action phrases
  for (const ap of ACTION_PHRASES) {
    const idx = lower.indexOf(ap.phrase);
    if (idx >= 0) {
      const alreadyConsumed = charConsumed.slice(idx, idx + ap.phrase.length).some(Boolean);
      if (!alreadyConsumed) {
        tokens.push({
          raw: input.slice(idx, idx + ap.phrase.length),
          normalized: ap.phrase,
          type: 'action',
          startIndex: idx,
        });
        for (let i = idx; i < idx + ap.phrase.length; i++) charConsumed[i] = true;
        consumed.set(ap.phrase, 'action');
      }
    }
  }

  // Multi-word filter phrases
  for (const fp of FILTER_PHRASES) {
    const idx = lower.indexOf(fp.phrase);
    if (idx >= 0) {
      const alreadyConsumed = charConsumed.slice(idx, idx + fp.phrase.length).some(Boolean);
      if (!alreadyConsumed) {
        tokens.push({
          raw: input.slice(idx, idx + fp.phrase.length),
          normalized: fp.phrase,
          type: 'filter',
          startIndex: idx,
        });
        for (let i = idx; i < idx + fp.phrase.length; i++) charConsumed[i] = true;
        consumed.set(fp.phrase, 'filter');
      }
    }
  }

  // Remaining: split unconsumed regions on whitespace
  let regionStart = -1;
  for (let i = 0; i <= lower.length; i++) {
    const isConsumed = i === lower.length || charConsumed[i];
    const isSpace = i < lower.length && /\s/.test(lower[i]);
    if (regionStart >= 0 && (isConsumed || isSpace || i === lower.length)) {
      if (i > regionStart) {
        const word = input.slice(regionStart, i).replace(/[.,;:!?'"]+$/g, '').trim();
        if (word.length > 0) {
          const norm = word.toLowerCase();
          let type: TokenType = 'unknown';
          if (ACTION_VERBS[norm]) type = 'action';
          else if (FILTER_KEYWORDS[norm]) type = 'filter';
          else if (METRIC_WORDS.has(norm)) type = 'metric';
          tokens.push({ raw: word, normalized: norm, type, startIndex: regionStart });
        }
      }
      regionStart = -1;
    } else if (regionStart < 0 && !isConsumed && !isSpace) {
      regionStart = i;
    }
  }

  // Sort by startIndex
  tokens.sort((a, b) => a.startIndex - b.startIndex);
  return { tokens, consumed };
}

// ─── Step 2: Time Context Extraction ─────────────────────────

function extractTimeContext(tokens: Token[]): TimeContext | null {
  const timeToken = tokens.find((t) => t.type === 'time');
  if (!timeToken) return null;

  const match = TIME_PHRASES.find((tp) => tp.phrase === timeToken.normalized);
  if (!match) return null;

  const now = new Date();
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');

  let start: Date;
  let end: Date;

  switch (match.key) {
    case 'today':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'yesterday':
      start = startOfDay(subDays(now, 1));
      end = endOfDay(subDays(now, 1));
      break;
    case '7d':
      start = startOfDay(subDays(now, 6));
      end = endOfDay(now);
      break;
    case '30d':
      start = startOfDay(subDays(now, 29));
      end = endOfDay(now);
      break;
    case '90d':
      start = startOfDay(subDays(now, 89));
      end = endOfDay(now);
      break;
    case 'thisWeek':
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfDay(now);
      break;
    case 'lastWeek':
      start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case 'thisMonth':
      start = startOfMonth(now);
      end = endOfDay(now);
      break;
    case 'lastMonth':
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
      break;
    case 'ytd':
      start = startOfYear(now);
      end = endOfDay(now);
      break;
    case 'lastYear': {
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      start = lastYear;
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    }
    case 'q1':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 2, 31);
      break;
    case 'q2':
      start = new Date(now.getFullYear(), 3, 1);
      end = new Date(now.getFullYear(), 5, 30);
      break;
    case 'q3':
      start = new Date(now.getFullYear(), 6, 1);
      end = new Date(now.getFullYear(), 8, 30);
      break;
    case 'q4':
      start = new Date(now.getFullYear(), 9, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      return null;
  }

  return {
    type: 'relative',
    value: match.key,
    label: match.label,
    startDate: iso(start),
    endDate: iso(end),
  };
}

// ─── Step 3: Filter Extraction ───────────────────────────────

function extractFilters(tokens: Token[]): Record<string, any> {
  const filters: Record<string, any> = {};

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'filter') continue;

    // Multi-word filter phrase
    const fp = FILTER_PHRASES.find((f) => f.phrase === t.normalized);
    if (fp) {
      Object.assign(filters, fp.filter);
      // Check for adjacent number
      const next = tokens[i + 1];
      if (next && /^\d+$/.test(next.normalized)) {
        filters.limit = parseInt(next.normalized, 10);
        next.type = 'filter'; // consume it
      }
      continue;
    }

    // Single-word filter
    const fk = FILTER_KEYWORDS[t.normalized];
    if (fk) {
      Object.assign(filters, fk);
      // Check for adjacent number (e.g. "top 10", "inactive 60")
      const next = tokens[i + 1];
      if (next && /^\d+$/.test(next.normalized)) {
        if (fk.rank) {
          filters.limit = parseInt(next.normalized, 10);
        } else if (fk.status === 'inactive') {
          filters.inactivity_days = parseInt(next.normalized, 10);
        }
        next.type = 'filter'; // consume it
      }
    }
  }

  return filters;
}

// ─── Step 4: Action Intent Detection ─────────────────────────

function detectAction(tokens: Token[]): ActionIntent | null {
  // Check multi-word action phrases first
  for (const t of tokens) {
    if (t.type === 'action') {
      const ap = ACTION_PHRASES.find((a) => a.phrase === t.normalized);
      if (ap) {
        return { type: ap.canonical, confidence: 0.9 };
      }
    }
  }

  // Single-word action verbs
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'action') continue;

    const canonical = ACTION_VERBS[t.normalized];
    if (!canonical) continue;

    // Look for target noun in remaining tokens
    let target: string | undefined;
    let actionType = canonical;

    for (let j = i + 1; j < tokens.length; j++) {
      const next = tokens[j];
      if (next.type === 'time' || next.type === 'filter') continue;
      const targetNoun = TARGET_NOUNS[next.normalized];
      if (targetNoun) {
        target = targetNoun;
        actionType = `${canonical}_${targetNoun}`;
        next.type = 'action'; // consume
        break;
      }
      // Use raw value as target if it's an entity candidate
      if (next.type === 'unknown' || next.type === 'entity_candidate') {
        target = next.raw;
        break;
      }
    }

    return { type: actionType, target, confidence: 0.9 };
  }

  return null;
}

// ─── Step 5: Intent Classification ───────────────────────────

function classifyIntents(
  raw: string,
  tokens: Token[],
  timeContext: TimeContext | null,
  filters: Record<string, any>,
  actionIntent: ActionIntent | null
): ScoredIntent[] {
  const scores: Record<IntentType, number> = {
    entity_lookup: 0,
    navigation: 0,
    analytics_query: 0,
    action_request: 0,
    help_query: 0,
    ambiguous: 0.15,
  };

  // Question detection
  if (isQuestionQuery(raw)) {
    scores.help_query += 0.7;
  }

  // Action verb present
  if (actionIntent) {
    scores.action_request += 0.6;
  }

  // Metric/analytics tokens
  const hasMetric = tokens.some((t) => t.type === 'metric');
  if (hasMetric) {
    scores.analytics_query += 0.5;
  }

  // Time + metric = strong analytics signal
  if (timeContext && hasMetric) {
    scores.analytics_query += 0.3;
  }

  // Time alone boosts analytics somewhat
  if (timeContext && !hasMetric) {
    scores.analytics_query += 0.15;
  }

  // Filter keywords boost analytics
  if (Object.keys(filters).length > 0) {
    scores.analytics_query += 0.2;
  }

  // Remaining unclassified tokens suggest entity lookup
  const unclassified = tokens.filter(
    (t) => t.type === 'unknown' || t.type === 'entity_candidate'
  );
  if (unclassified.length > 0) {
    scores.entity_lookup += 0.4;
    // If the unclassified token looks like a proper noun (starts uppercase), boost
    if (unclassified.some((t) => /^[A-Z]/.test(t.raw))) {
      scores.entity_lookup += 0.15;
    }
  }

  // Navigation: check if raw input contains common nav words
  const navWords = ['settings', 'dashboard', 'schedule', 'calendar', 'payroll',
    'directory', 'profile', 'help', 'training', 'reports', 'campaigns',
    'announcements', 'recruiting', 'chat', 'inbox'];
  const lower = raw.toLowerCase();
  if (navWords.some((w) => lower.includes(w))) {
    scores.navigation += 0.6;
  }

  // Build sorted array, filter out zero-score
  const intents: ScoredIntent[] = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .map(([type, confidence]) => ({
      type: type as IntentType,
      confidence: Math.min(confidence, 1),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return intents;
}

// ─── Step 6: Entity Candidates ───────────────────────────────

function extractEntityCandidates(
  tokens: Token[],
  actionIntent: ActionIntent | null
): EntityCandidate[] {
  const candidates: EntityCandidate[] = [];

  for (const t of tokens) {
    if (t.type !== 'unknown') continue;

    // Pure number → could be transaction ID
    if (/^\d+$/.test(t.normalized)) {
      candidates.push({ type: 'transaction', value: t.raw, confidence: 0.4 });
      continue;
    }

    // Determine likely entity type from context
    let entityType: EntityType = 'stylist'; // default for name-like tokens
    let confidence = 0.5;

    if (actionIntent) {
      if (['message', 'email', 'send'].includes(actionIntent.type)) {
        entityType = 'stylist';
        confidence = 0.6;
      } else if (['book', 'book_appointment'].includes(actionIntent.type)) {
        entityType = 'client';
        confidence = 0.55;
      }
    }

    // Capitalize hint → likely a name
    if (/^[A-Z]/.test(t.raw)) {
      confidence += 0.1;
    }

    candidates.push({ type: entityType, value: t.raw, confidence });
    t.type = 'entity_candidate';
  }

  return candidates;
}

// ─── Step 7: Confidence Model ────────────────────────────────

function computeConfidence(
  intents: ScoredIntent[],
  timeContext: TimeContext | null,
  entities: EntityCandidate[]
): ParsedQuery['confidence'] {
  const intentClarity =
    intents.length >= 2
      ? intents[0].confidence - intents[1].confidence
      : intents.length === 1
        ? intents[0].confidence
        : 0;

  const timeResolution = timeContext ? 1.0 : 0;
  const entityResolution = 0; // resolved later by hook

  // Weighted average
  const overall =
    (intents[0]?.confidence ?? 0) * 0.4 +
    intentClarity * 0.2 +
    timeResolution * 0.2 +
    (entities.length > 0 ? 0.2 : 0);

  return {
    overall: Math.min(overall, 1),
    intentClarity,
    entityResolution,
    timeResolution,
  };
}

// ─── Orchestrator ────────────────────────────────────────────

const EMPTY_RESULT: ParsedQuery = {
  raw: '',
  tokens: [],
  intents: [],
  entities: [],
  filters: {},
  timeContext: null,
  actionIntent: null,
  confidence: { overall: 0, intentClarity: 0, entityResolution: 0, timeResolution: 0 },
  remainingTokens: [],
};

export function parseQuery(input: string): ParsedQuery {
  const raw = input.trim();

  // Edge: empty or too short
  if (raw.length === 0) return { ...EMPTY_RESULT, raw };
  if (raw.length === 1) {
    return {
      ...EMPTY_RESULT,
      raw,
      tokens: [{ raw, normalized: raw.toLowerCase(), type: 'unknown', startIndex: 0 }],
      intents: [{ type: 'ambiguous', confidence: 0.2 }],
      remainingTokens: [raw],
    };
  }

  // Step 1: Tokenize
  const { tokens } = tokenize(raw);

  // Step 2: Extract time context
  const timeContext = extractTimeContext(tokens);

  // Step 3: Extract filters
  const filters = extractFilters(tokens);

  // Step 4: Detect action
  const actionIntent = detectAction(tokens);

  // Step 5: Entity candidates (from remaining unknown tokens)
  const entities = extractEntityCandidates(tokens, actionIntent);

  // Step 6: Classify intents
  const intents = classifyIntents(raw, tokens, timeContext, filters, actionIntent);

  // Remaining tokens = entity candidates not yet resolved
  const remainingTokens = tokens
    .filter((t) => t.type === 'entity_candidate' || t.type === 'unknown')
    .map((t) => t.raw);

  // Step 7: Confidence
  const confidence = computeConfidence(intents, timeContext, entities);

  return {
    raw,
    tokens,
    intents,
    entities,
    filters,
    timeContext,
    actionIntent,
    confidence,
    remainingTokens,
  };
}
