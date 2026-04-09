

# Zura Synonym & Alias Intelligence System

## Audit Findings

The current codebase has vocabulary scattered across multiple locations with no unifying language layer:

**Parser hardcoded vocabulary:**
- `ACTION_VERBS`: 14 entries (add→create, book→book, etc.)
- `TARGET_NOUNS`: 11 entries (client, booking→appointment, staff→stylist, etc.)
- `FILTER_KEYWORDS`: 7 entries (cancelled, active, top, etc.)
- `METRIC_WORDS`: ~20 metric-derived words plus manual additions (revenue, sales, retail, etc.)
- `navWords`: 15 hardcoded strings for navigation intent detection (settings, dashboard, calendar, etc.)
- `FILTER_PHRASES`: 6 entries (no shows, new clients, etc.)

**Language gaps identified:**
- "team" doesn't resolve to "staff" or "employees" in nav matching — only in `TARGET_NOUNS`
- "calendar" is a navWord but nav label is "Schedule" — text matching will fail
- "bookings" isn't a navWord, only "schedule" and "calendar"
- "payroll" is a navWord but actual labels are "My Pay" and "Compensation Ratio"
- "compensation" isn't mapped to payroll
- "front desk" / "reception" / "check-in" have no alias chain
- Report names use internal labels ("Staff KPI Report") but operators search "performance" or "numbers"
- "clients" vs "guests" — no alias
- "transactions" vs "tickets" vs "sales" — only partial coverage in METRIC_WORDS
- Hub labels like "Operations Hub" won't match "team management" or "manage team"
- "Color Bar" won't match "color" or "mixing" or "formulas"

**Integration points (where synonym system feeds in):**
1. **Parser tokenization** (Step 1): Synonym-aware token classification so "compensation" is recognized as a metric word
2. **Ranker text matching** (line 265): `scoreMatch` only does substring — can't match "calendar" → "Schedule"
3. **Ranker candidate generation** (useSearchRanking): Candidates have fixed titles — synonyms should expand what matches
4. **Suggestion generation**: When no results, synonym-aware suggestions could say "Did you mean Schedule?" for "calendar"

## Architecture

Two new files, no modifications to parser or ranker internals. The synonym system wraps around them.

```text
src/lib/synonymRegistry.ts     ← Pure data: alias maps, concept clusters, expansion logic
src/lib/textMatch.ts           ← Extended: synonym-aware scoring function added alongside existing scoreMatch
```

One modified file:
```text
src/hooks/useSearchRanking.ts  ← Consult synonym registry during candidate scoring
```

## File 1: `src/lib/synonymRegistry.ts`

### Data Structures

```typescript
// Layer 1: Exact aliases (bidirectional equivalence groups)
interface AliasGroup {
  canonical: string;           // product label (e.g. "schedule")
  aliases: string[];           // operator terms (e.g. ["calendar", "bookings", "book"])
  context?: IntentType[];      // optional: only apply in these intent contexts
}

// Layer 2: Concept clusters (semantic neighborhoods)
interface ConceptCluster {
  id: string;                  // e.g. "money"
  terms: string[];             // terms that belong to this concept
  relatedPaths?: string[];     // nav paths in this concept neighborhood
  boost: number;               // 0-1, how much concept match contributes (default 0.3)
}

// Layer 3: Organization overrides (architecture only, no admin UI yet)
interface OrgAliasOverride {
  orgId: string;
  overrides: Record<string, string[]>;  // canonical → additional aliases
}
```

### Layer 1 — Exact Alias Registry

Approximately 25-30 alias groups covering all nav items, report types, and common operator vocabulary:

| Canonical | Aliases |
|-----------|---------|
| schedule | calendar, bookings, book, appointments |
| team chat | messages, messaging, inbox, chat |
| command center | dashboard, home, overview |
| my pay | payroll, compensation, earnings, paycheck |
| analytics hub | analytics, data, numbers, insights |
| operations hub | team management, manage team, staff management |
| training | education, learning, courses |
| client | guest, customer |
| stylist | staff, employee, team member, provider |
| transaction | ticket, sale, checkout, receipt |
| commission | payout, comp, earnings |
| no show | no-show, missed, didn't show |
| waitlist | waiting list, walk-ins |
| settings | preferences, config, configuration |
| reports | reporting, report generator |
| leaderboard | rankings, competition, scoreboard |
| rewards | incentives, perks, bonuses |
| shift swaps | trade shifts, swap schedule |
| color bar | color, mixing, formulas |
| campaigns | marketing, promotions, ads |
| feedback | reviews, ratings, nps |
| retention | loyalty, repeat clients, returning |
| utilization | capacity, busy, availability |
| headshots | photos, portraits |
| graduation | levels, level progress, advancement |

### Layer 2 — Concept Clusters

~10 clusters for broad semantic neighborhoods:

- **money**: revenue, sales, transactions, tickets, commissions, payroll, refunds, pricing, tips, discounts, retail
- **people**: clients, guests, stylists, staff, team, employees, directory, headshots
- **scheduling**: appointments, bookings, calendar, schedule, waitlist, availability, no-shows, cancellations
- **performance**: kpi, metrics, analytics, stats, leaderboard, utilization, retention, rebooking
- **growth**: training, graduation, levels, program, new-client engine, milestones
- **operations**: check-in, front desk, shift swaps, announcements, pto, time attendance
- **marketing**: campaigns, seo, leads, promotions, ads, reengagement
- **reports**: all report catalog IDs mapped to their natural-language names
- **admin**: settings, permissions, roles, access, feature flags
- **products**: retail, inventory, color bar, mixing, product sales

### Layer 4 — Intent-Aware Expansion Rules

The registry exposes a function:

```typescript
function expandQuery(
  query: string,
  topIntent: IntentType | null
): { 
  expandedTerms: string[];           // additional search terms to match against
  aliasMatches: AliasMatch[];        // which aliases fired and with what confidence
  conceptMatches: ConceptMatch[];    // which concept clusters activated
}
```

Context rules:
- "book" + `action_request` intent → expand as verb (schedule), NOT "bookings" page
- "book" + `navigation` intent → expand to "schedule", "calendar", "bookings"
- "refund" + `action_request` → action verb, don't expand to reports
- "refund" + `analytics_query` → expand to "refunded transactions", relevant reports
- If no intent is strong, expand conservatively (aliases only, no concept clusters)

### Confidence Impacts

```typescript
interface AliasMatch {
  original: string;
  canonical: string;
  matchType: 'exact_alias' | 'concept' | 'typo_correction';
  confidence: number;  // exact_alias: 0.9, concept: 0.3-0.5, typo: 0.6
}
```

Precedence rules (hard):
1. **Exact title match** → score 1.0, no expansion needed
2. **Exact alias match** → treated as 90% of exact match (score × 0.9)
3. **Substring/starts-with match** → existing scoreMatch behavior unchanged
4. **Concept cluster match** → small boost (0.15-0.30) to candidates in the same cluster
5. **Typo correction** → if Levenshtein distance ≤ 2 from a known alias, apply with 0.6 confidence

Over-expansion guard: concept cluster expansion ONLY activates when:
- Query has ≥2 tokens (single words use alias only)
- No exact or alias match scores above 0.7 (don't dilute strong matches)
- Maximum 5 concept-expanded candidates added per cluster

### Typo Tolerance

Separate from synonyms. A small utility:
```typescript
function findNearMatch(input: string, vocabulary: string[]): string | null
```
Uses Levenshtein distance ≤ 2 against all known aliases and canonical terms. Returns the closest match or null. Called only when no alias or exact match is found.

### Observability

```typescript
interface SynonymTelemetry {
  query: string;
  aliasesUsed: AliasMatch[];
  conceptsActivated: string[];
  hadResults: boolean;
  timestamp: number;
}
```

Stored in localStorage under `zura-synonym-telemetry` (ring buffer, last 100 entries). Enables future analysis of which aliases fire, where users still fail, and what vocabulary gaps remain.

## File 2: `src/lib/textMatch.ts` — Extension

Add a new export alongside existing `scoreMatch`:

```typescript
export function scoreMatchWithSynonyms(
  haystack: string,
  query: string,
  expandedTerms: string[]
): { score: number; matchedVia: 'exact' | 'substring' | 'alias' | 'concept' | 'none' }
```

This tries `scoreMatch(haystack, query)` first. If score is 0, it tries each expanded term against the haystack, returning the best score with a confidence discount based on match type.

## File 3: `src/hooks/useSearchRanking.ts` — Integration

In the ranking memo, before calling `rankResults`:
1. Call `expandQuery(query, parsed.intents[0]?.type)` to get expanded terms + alias matches
2. Pass expanded terms into a modified scoring context so `rankResults` can use synonym-aware text matching
3. Log telemetry for observability

The ranker itself (`searchRanker.ts`) is NOT modified. Instead, the hook pre-computes synonym-boosted text match scores and injects them via the existing `SearchCandidate` subtitle field or by generating additional virtual candidates for strong alias matches.

Approach: For each alias match with confidence ≥ 0.8, if the alias maps to a known nav path, ensure a candidate exists for it. This way "calendar" automatically surfaces the "Schedule" candidate even though "calendar" doesn't substring-match "Schedule".

## Example Query Transformations

| Input | Alias Expansion | Concept Expansion | Result |
|-------|----------------|-------------------|--------|
| "calendar" | → "schedule" (exact alias, 0.9) | scheduling cluster (suppressed — alias is strong) | Schedule page ranks #1 |
| "payroll" | → "my pay" (exact alias, 0.9) | money cluster (suppressed) | My Pay ranks #1 |
| "money" | no alias match | money cluster activates → boosts transactions, revenue, commissions, payroll candidates | Multiple results across groups |
| "payrol" | no alias → typo check → "payroll" (Levenshtein 1, 0.6) → then alias → "my pay" | — | My Pay ranks with slightly lower score |
| "book Sarah" | "book" + action intent → verb expansion only (schedule), no nav expansion | — | Action: Book Appointment for Sarah |
| "guest list" | "guest" → "client" (alias) | people cluster | Client Directory ranks #1 |
| "numbers" | → "analytics hub" (alias, 0.9) | performance cluster | Analytics Hub ranks #1 |
| "front desk" | → "waitlist", "check-in" (alias) | operations cluster | Waitlist + check-in actions surface |

## Tests

New file `src/lib/__tests__/synonymRegistry.test.ts`:
- Alias resolution: "calendar" → finds "schedule" canonical
- Concept activation: "money" → activates money cluster with correct terms
- Intent-aware expansion: "book" with action intent ≠ "book" with navigation intent
- Typo tolerance: "payrol" → "payroll" → "my pay"
- Over-expansion guard: exact match suppresses concept expansion
- Confidence ordering: exact > alias > concept
- Unknown term: "xyzabc" → no expansion, no crash

## Self-Audit

**Noise risk**: Mitigated by confidence discounting (alias 0.9, concept 0.3-0.5) and over-expansion guards. Concept clusters only activate when no strong direct match exists.

**Ambiguity risk**: Intent-aware expansion prevents "book" from simultaneously meaning the verb and the noun. Context from adjacent tokens and top intent drives disambiguation.

**Maintainability**: Single registry file. Alias groups are declarative arrays — adding a new alias is one line. No scattered conditionals.

**Operator-language fit**: Aliases derived from actual salon vocabulary (guest, ticket, front desk, formulas, levels). Concept clusters model how operators think about their business domains.

**Performance**: Registry is a static lookup (Map-based). Expansion is O(alias count) which is ~100 entries. Typo check is O(vocabulary × query length) but vocabulary is small (~200 terms) and Levenshtein is bounded at distance 2.

## Files Summary

| File | Action |
|------|--------|
| `src/lib/synonymRegistry.ts` | Create — alias groups, concept clusters, expansion logic, telemetry |
| `src/lib/textMatch.ts` | Edit — add `scoreMatchWithSynonyms` alongside existing `scoreMatch` |
| `src/hooks/useSearchRanking.ts` | Edit — integrate synonym expansion into ranking pipeline |
| `src/lib/__tests__/synonymRegistry.test.ts` | Create — comprehensive tests |

No database changes. No edge functions. No parser modifications. No ranker modifications.

