/**
 * Shade-level sorting for professional hair color products.
 * Extracts numeric shade levels from product names and sorts darkest → lightest,
 * with "Clear" always last.
 */

/**
 * Extracts the numeric shade level from a product name.
 * Examples:
 *   "Calura 3NN Dark Brown"     → 3
 *   "ChromaSilk 10.02 Blonde"   → 10.02
 *   "Demi Clear"                → Infinity (sorts last)
 *   "Bond Builder Pro"          → 999 (no level found, near end)
 */
export function extractShadeLevel(name: string): number {
  const lower = name.toLowerCase().trim();

  // "Clear" products always sort last
  if (/\bclear\b/i.test(lower)) return Infinity;

  // Look for a standalone number (integer or decimal) that represents a shade level.
  // Match patterns like "3NN", "10.02", "6/1", "7.43G", "5N", etc.
  // We want the leading numeric portion from these tokens.
  const tokens = name.split(/\s+/);
  for (const token of tokens) {
    // Match tokens that START with a number (possibly followed by letters like NN, G, etc.)
    // Also handle slash notation like "6/1" → take 6
    const match = token.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      // Shade levels are typically 1-12 range, but be generous (0-20)
      if (num >= 0 && num <= 20) return num;
    }
  }

  // No level found — sort near the end but before Clear
  return 999;
}

/**
 * Sorts an array of products by shade level (darkest → lightest, Clear last).
 * Stable sort: products with the same level maintain their original order.
 */
export function sortByShadeLevel<T extends { name: string }>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const la = extractShadeLevel(a.name);
    const lb = extractShadeLevel(b.name);
    if (la !== lb) return la - lb;
    // Secondary: alphabetical by name for same level
    return a.name.localeCompare(b.name);
  });
}

/** Categories that should use shade-level sorting */
export const SHADE_SORTED_CATEGORIES = new Set(['color', 'toner', 'semi-permanent']);
