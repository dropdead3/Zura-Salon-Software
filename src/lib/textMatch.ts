/**
 * Shared text-matching utility.
 * Single canonical location for substring/word-boundary scoring.
 */

/** Score how well `query` matches `haystack`. Returns 0–100. */
export function scoreMatch(haystack: string, query: string): number {
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

// ─── Synonym-aware scoring ──────────────────────────────────

export type MatchVia = 'exact' | 'substring' | 'alias' | 'concept' | 'none';

export interface SynonymScoreResult {
  score: number;
  matchedVia: MatchVia;
  /** The expanded term that matched (if any) */
  matchedTerm?: string;
}

/** Confidence discounts applied to scores from non-direct matches */
const MATCH_CONFIDENCE: Record<string, number> = {
  exact_alias: 0.9,
  concept: 0.3,
  typo_correction: 0.6,
};

/**
 * Score haystack against query, falling back to expanded synonym terms.
 * Returns the best score found and how it was matched.
 */
export function scoreMatchWithSynonyms(
  haystack: string,
  query: string,
  expandedTerms: string[],
  aliasConfidence?: number,
): SynonymScoreResult {
  // Try direct match first
  const directScore = scoreMatch(haystack, query);
  if (directScore > 0) {
    const via: MatchVia = directScore === 100 ? 'exact' : 'substring';
    return { score: directScore, matchedVia: via };
  }

  // Try each expanded term
  let bestScore = 0;
  let bestTerm: string | undefined;
  let bestVia: MatchVia = 'none';

  const discount = aliasConfidence ?? MATCH_CONFIDENCE.exact_alias;

  for (const term of expandedTerms) {
    const s = scoreMatch(haystack, term);
    if (s > bestScore) {
      bestScore = s;
      bestTerm = term;
      bestVia = 'alias';
    }
  }

  if (bestScore > 0) {
    return {
      score: bestScore * discount,
      matchedVia: bestVia,
      matchedTerm: bestTerm,
    };
  }

  return { score: 0, matchedVia: 'none' };
}
