/**
 * Zura Multi-Query Chaining Engine
 * Post-parser chain assembler that consumes ParsedQuery output
 * and produces a structured ChainedQuery with typed slots.
 *
 * Does NOT modify the parser. Layers on top.
 */
import type { ParsedQuery, TimeContext, ActionIntent } from '@/lib/queryParser';

// ─── Types ───────────────────────────────────────────────────

export interface ChainSlot {
  value: string;
  source: 'token' | 'alias' | 'inferred';
  confidence: number;
}

export interface NegativeFilter {
  type: 'no_bookings' | 'no_rebook' | 'no_visit' | 'no_show' | 'no_retail';
  daysThreshold?: number;
}

export interface RankingModifier {
  direction: 'top' | 'bottom' | 'newest' | 'oldest' | 'highest' | 'lowest';
}

export interface DestinationHint {
  path: string;
  params: Record<string, string>;
  label: string;
  confidence: number;
}

export type ChainSubjectType = 'stylist' | 'client' | 'location' | 'service' | 'unknown';

export interface ChainedQuery {
  raw: string;
  subject: ChainSlot | null;
  topic: ChainSlot | null;
  timeRange: TimeContext | null;
  locationScope: ChainSlot | null;
  rankingModifier: RankingModifier | null;
  negativeFilter: NegativeFilter | null;
  actionVerb: ActionIntent | null;
  limit: number | null;
  subjectType: ChainSubjectType | null;
  destinationHint: DestinationHint | null;
  confidence: number;
  /** Number of classified slots (excluding raw/confidence/destination) */
  slotCount: number;
}

// ─── Vocabularies ────────────────────────────────────────────

const NEGATIVE_FILTER_PHRASES: { phrases: string[]; type: NegativeFilter['type'] }[] = [
  { phrases: ['no bookings', 'no booking', 'no appointments', 'not booked'], type: 'no_bookings' },
  { phrases: ['no rebook', 'no rebooking', "didn't rebook", 'not rebooked'], type: 'no_rebook' },
  { phrases: ['no visit', 'no visits', "haven't visited", 'not visited'], type: 'no_visit' },
  { phrases: ['no show', 'no shows', 'no-show'], type: 'no_show' },
  { phrases: ['no retail', 'no product', 'no products'], type: 'no_retail' },
];

const RANKING_MODIFIER_WORDS: Record<string, RankingModifier['direction']> = {
  top: 'top',
  best: 'top',
  highest: 'highest',
  lowest: 'lowest',
  bottom: 'bottom',
  worst: 'bottom',
  newest: 'newest',
  oldest: 'oldest',
  underperforming: 'lowest',
};

const TOPIC_FAMILIES: Record<string, { topic: string; route: string; tab?: string }> = {
  retail: { topic: 'retail', route: '/dashboard/admin/sales', tab: 'retail' },
  product: { topic: 'retail', route: '/dashboard/admin/sales', tab: 'retail' },
  products: { topic: 'retail', route: '/dashboard/admin/sales', tab: 'retail' },
  sales: { topic: 'sales', route: '/dashboard/admin/sales' },
  revenue: { topic: 'revenue', route: '/dashboard/admin/sales' },
  refund: { topic: 'refunds', route: '/dashboard/appointments-hub', tab: 'transactions' },
  refunds: { topic: 'refunds', route: '/dashboard/appointments-hub', tab: 'transactions' },
  appointments: { topic: 'appointments', route: '/dashboard/appointments-hub' },
  appointment: { topic: 'appointments', route: '/dashboard/appointments-hub' },
  cancellations: { topic: 'cancellations', route: '/dashboard/appointments-hub' },
  cancelled: { topic: 'cancellations', route: '/dashboard/appointments-hub' },
  utilization: { topic: 'utilization', route: '/dashboard/admin/staff-utilization' },
  retention: { topic: 'retention', route: '/dashboard/admin/reengagement' },
  rebooking: { topic: 'retention', route: '/dashboard/admin/reengagement' },
  rebook: { topic: 'retention', route: '/dashboard/admin/reengagement' },
  commission: { topic: 'commission', route: '/dashboard/admin/sales', tab: 'commission' },
  color: { topic: 'color', route: '/dashboard/admin/operational-analytics' },
  performance: { topic: 'performance', route: '/dashboard/admin/staff-utilization' },
  kpi: { topic: 'kpi', route: '/dashboard/admin/reports' },
  kpis: { topic: 'kpi', route: '/dashboard/admin/reports' },
};

/** Words that indicate the subject type is 'client' */
const CLIENT_INDICATOR_WORDS = new Set([
  'client', 'clients', 'customer', 'customers', 'guest', 'guests',
]);

/** Words that indicate the subject type is 'stylist' */
const STYLIST_INDICATOR_WORDS = new Set([
  'stylist', 'stylists', 'staff', 'team', 'member', 'members', 'employee', 'employees',
]);

/** Filler words to ignore during slot extraction */
const FILLER_WORDS = new Set([
  'with', 'for', 'in', 'at', 'the', 'a', 'an', 'and', 'or', 'of', 'who', 'that', 'show', 'me',
]);

// ─── Negative Filter Extraction ──────────────────────────────

interface NegFilterResult {
  filter: NegativeFilter | null;
  consumedIndices: Set<number>;
}

function extractNegativeFilter(lower: string, tokenNorms: string[]): NegFilterResult {
  for (const nf of NEGATIVE_FILTER_PHRASES) {
    for (const phrase of nf.phrases) {
      const idx = lower.indexOf(phrase);
      if (idx < 0) continue;

      // Mark token indices that fall within this phrase
      const consumed = new Set<number>();
      const phraseWords = phrase.split(/\s+/);
      for (let i = 0; i < tokenNorms.length; i++) {
        if (phraseWords.includes(tokenNorms[i])) {
          consumed.add(i);
        }
      }

      // Check for trailing "N days" pattern
      let daysThreshold: number | undefined;
      // Find end of consumed range
      const maxConsumed = Math.max(...consumed);
      if (maxConsumed + 1 < tokenNorms.length) {
        const maybeNum = tokenNorms[maxConsumed + 1];
        if (/^\d+$/.test(maybeNum)) {
          daysThreshold = parseInt(maybeNum, 10);
          consumed.add(maxConsumed + 1);
          // Also consume trailing "days"/"day" if present
          if (maxConsumed + 2 < tokenNorms.length &&
              ['days', 'day'].includes(tokenNorms[maxConsumed + 2])) {
            consumed.add(maxConsumed + 2);
          }
        }
      }

      return {
        filter: { type: nf.type, daysThreshold },
        consumedIndices: consumed,
      };
    }
  }
  return { filter: null, consumedIndices: new Set() };
}

// ─── Chain Assembly ──────────────────────────────────────────

export function assembleChain(
  parsed: ParsedQuery,
  locationNames: string[] = [],
): ChainedQuery {
  const result: ChainedQuery = {
    raw: parsed.raw,
    subject: null,
    topic: null,
    timeRange: parsed.timeContext,
    locationScope: null,
    rankingModifier: null,
    negativeFilter: null,
    actionVerb: parsed.actionIntent,
    limit: parsed.filters.limit ?? null,
    subjectType: null,
    destinationHint: null,
    confidence: 0,
    slotCount: 0,
  };

  // Collect all token normalized forms (excluding time tokens already consumed by parser)
  const allTokens = parsed.tokens.filter(t => t.type !== 'time');
  const tokenNorms = allTokens.map(t => t.normalized);
  const lower = parsed.raw.toLowerCase();

  // Track which token indices are consumed by chaining
  const consumed = new Set<number>();

  // ── Step 1: Negative filter extraction ──
  const negResult = extractNegativeFilter(lower, tokenNorms);
  if (negResult.filter) {
    result.negativeFilter = negResult.filter;
    negResult.consumedIndices.forEach(i => consumed.add(i));
  }

  // ── Step 2: Ranking modifier extraction ──
  for (let i = 0; i < tokenNorms.length; i++) {
    if (consumed.has(i)) continue;
    const mod = RANKING_MODIFIER_WORDS[tokenNorms[i]];
    if (mod) {
      result.rankingModifier = { direction: mod };
      consumed.add(i);
      break; // only one modifier
    }
  }

  // ── Step 3: Location scope resolution ──
  const lowerLocationNames = locationNames.map(n => n.toLowerCase());
  for (let i = 0; i < tokenNorms.length; i++) {
    if (consumed.has(i)) continue;
    const tok = tokenNorms[i];
    const locIdx = lowerLocationNames.findIndex(ln => ln === tok || ln.includes(tok));
    if (locIdx >= 0 && tok.length >= 3) {
      result.locationScope = {
        value: locationNames[locIdx],
        source: 'token',
        confidence: tok === lowerLocationNames[locIdx] ? 0.95 : 0.75,
      };
      consumed.add(i);
      break;
    }
  }

  // ── Step 4: Topic classification ──
  for (let i = 0; i < tokenNorms.length; i++) {
    if (consumed.has(i)) continue;
    const family = TOPIC_FAMILIES[tokenNorms[i]];
    if (family) {
      result.topic = {
        value: family.topic,
        source: 'token',
        confidence: 0.9,
      };
      consumed.add(i);
      break;
    }
  }

  // ── Step 5: Subject type inference ──
  let hasClientWord = false;
  let hasStylistWord = false;
  for (let i = 0; i < tokenNorms.length; i++) {
    if (consumed.has(i)) continue;
    if (CLIENT_INDICATOR_WORDS.has(tokenNorms[i])) {
      hasClientWord = true;
      consumed.add(i);
    } else if (STYLIST_INDICATOR_WORDS.has(tokenNorms[i])) {
      hasStylistWord = true;
      consumed.add(i);
    }
  }

  if (hasClientWord) result.subjectType = 'client';
  else if (hasStylistWord) result.subjectType = 'stylist';

  // Remaining unconsumed, non-filler tokens become subject candidates
  for (let i = 0; i < tokenNorms.length; i++) {
    if (consumed.has(i)) continue;
    if (FILLER_WORDS.has(tokenNorms[i])) { consumed.add(i); continue; }
    if (allTokens[i].type === 'action') { consumed.add(i); continue; }
    if (allTokens[i].type === 'filter' && !RANKING_MODIFIER_WORDS[tokenNorms[i]]) { consumed.add(i); continue; }

    // This is a subject candidate (proper noun or remaining unknown)
    const isProperNoun = /^[A-Z]/.test(allTokens[i].raw);
    // Don't classify as subject if it was already classified as location
    if (result.locationScope?.value.toLowerCase() === tokenNorms[i]) continue;

    result.subject = {
      value: allTokens[i].raw,
      source: 'token',
      confidence: isProperNoun ? 0.7 : 0.5,
    };
    consumed.add(i);

    // Infer subject type from context if not already set
    if (!result.subjectType) {
      if (result.topic) {
        // Name + metric → likely stylist analytics
        result.subjectType = 'stylist';
      } else if (isProperNoun) {
        result.subjectType = 'stylist'; // default for proper nouns
      }
    }
    break; // only first subject
  }

  // ── Step 6: Count slots and compute confidence ──
  let slotCount = 0;
  if (result.subject) slotCount++;
  if (result.topic) slotCount++;
  if (result.timeRange) slotCount++;
  if (result.locationScope) slotCount++;
  if (result.rankingModifier) slotCount++;
  if (result.negativeFilter) slotCount++;
  if (result.actionVerb) slotCount++;
  result.slotCount = slotCount;

  // Skip chaining for single-slot queries (existing simple matching handles these)
  if (slotCount < 2) {
    result.confidence = slotCount > 0 ? 0.3 : 0;
    return result;
  }

  // Confidence: more slots = higher confidence, capped at 0.95
  result.confidence = Math.min(0.4 + slotCount * 0.12, 0.95);

  // ── Step 7: Destination hint generation ──
  result.destinationHint = generateDestinationHint(result);

  return result;
}

// ─── Destination Hint Generation ─────────────────────────────

function generateDestinationHint(chain: ChainedQuery): DestinationHint | null {
  // Action-first: if action verb present, skip destination (action framework handles it)
  if (chain.actionVerb) return null;

  const params: Record<string, string> = {};
  let path = '';
  let label = '';
  let confidence = 0.6;

  // Time parameter
  if (chain.timeRange) {
    params.period = chain.timeRange.value;
  }

  // Location parameter
  if (chain.locationScope) {
    params.location = chain.locationScope.value;
  }

  // Route selection based on chain composition
  if (chain.negativeFilter) {
    switch (chain.negativeFilter.type) {
      case 'no_rebook':
      case 'no_visit':
      case 'no_bookings':
        path = '/dashboard/admin/reengagement';
        params.filter = chain.negativeFilter.type;
        if (chain.negativeFilter.daysThreshold) {
          params.days = String(chain.negativeFilter.daysThreshold);
        }
        label = `Re-engagement — ${formatNegFilter(chain.negativeFilter)}`;
        confidence = 0.8;
        break;
      case 'no_show':
        path = '/dashboard/appointments-hub';

        params.filter = 'no_show';
        label = 'Appointments — No Shows';
        confidence = 0.8;
        break;
      case 'no_retail':
        path = '/dashboard/admin/sales';
        params.filter = 'no_retail';
        label = 'Sales — No Retail Purchases';
        confidence = 0.7;
        break;
    }
  } else if (chain.topic) {
    const family = Object.values(TOPIC_FAMILIES).find(f => f.topic === chain.topic!.value);
    if (family) {
      path = family.route;
      if (family.tab) params.tab = family.tab;
      label = capitalize(chain.topic.value) + ' Analytics';
      confidence = 0.75;
    }
  } else if (chain.rankingModifier && chain.subjectType === 'client') {
    path = '/dashboard/clients';
    params.sort = 'spend';
    params.dir = chain.rankingModifier.direction === 'top' || chain.rankingModifier.direction === 'highest'
      ? 'desc' : 'asc';
    label = `${capitalize(chain.rankingModifier.direction)} Clients`;
    confidence = 0.7;
  } else if (chain.rankingModifier && chain.subjectType === 'stylist') {
    path = '/dashboard/admin/staff-utilization';
    if (chain.rankingModifier.direction === 'lowest' || chain.rankingModifier.direction === 'bottom') {
      params.filter = 'low';
    }
    label = `${capitalize(chain.rankingModifier.direction)} Stylists`;
    confidence = 0.7;
  }

  // Build rich composite label from all chain slots
  label = buildRichLabel(chain, label);

  // Subject as search param for stylist entity + topic
  if (chain.subject && chain.subjectType === 'stylist' && path) {
    params.search = chain.subject.value;
  }

  if (!path) return null;

  // Build final URL with params
  const queryStr = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  return {
    path: queryStr ? `${path}?${queryStr}` : path,
    params,
    label,
    confidence,
  };
}

// ─── Label Helpers ───────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatNegFilter(nf: NegativeFilter): string {
  const base = nf.type.replace('no_', 'No ').replace('_', ' ');
  if (nf.daysThreshold) return `${base} (${nf.daysThreshold} days)`;
  return base;
}

function buildRichLabel(chain: ChainedQuery, baseLabel: string): string {
  const parts = [baseLabel];

  if (chain.locationScope) {
    parts.push(chain.locationScope.value);
  }
  if (chain.subject && chain.subjectType === 'stylist') {
    parts.push(chain.subject.value);
  }
  if (chain.timeRange) {
    const timeLabel = formatTimeValue(chain.timeRange.value);
    if (timeLabel) parts.push(timeLabel);
  }
  if (chain.rankingModifier && !baseLabel.toLowerCase().includes(chain.rankingModifier.direction)) {
    parts.push(capitalize(chain.rankingModifier.direction));
  }

  return parts.filter(Boolean).join(' · ');
}

function formatTimeValue(value: string): string {
  const map: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisQuarter: 'This Quarter',
    thisYear: 'This Year',
  };
  if (map[value]) return map[value];
  const dMatch = value.match(/^(\d+)d$/);
  if (dMatch) return `Last ${dMatch[1]} Days`;
  return '';
}
