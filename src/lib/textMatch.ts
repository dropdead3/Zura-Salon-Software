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
