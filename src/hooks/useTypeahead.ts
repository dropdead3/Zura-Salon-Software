import { useMemo } from 'react';

/**
 * Ghost-text typeahead hook.
 * Returns the best prefix-matching completion from a vocabulary list.
 */
export function useTypeahead(
  query: string,
  vocabulary: string[],
): string | null {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;

    // Find first vocabulary item that starts with the query (case-insensitive)
    for (const term of vocabulary) {
      const lower = term.toLowerCase();
      if (lower.startsWith(q) && lower !== q) {
        // Return the completion with original casing
        return term;
      }
    }
    return null;
  }, [query, vocabulary]);
}
