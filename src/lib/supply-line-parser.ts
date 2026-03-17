/**
 * supply-line-parser.ts
 * Extracts the product line prefix from a supply library product name.
 * e.g. "Majirel 7.0 Blonde" → "Majirel"
 *      "Dia Light 8.31"     → "Dia Light"
 *      "Vero K-PAK 5N"      → "Vero K-PAK"
 */

/** Known multi-word product line prefixes (longest first for greedy matching). */
const KNOWN_MULTI_WORD_PREFIXES = [
  // L'Oréal
  'Dia Richesse', 'Dia Light', 'Majirel Cool Cover', 'Majirel Cool Inforced',
  'Majirel High Lift', 'Majirel Glow',
  // Joico
  'Vero K-PAK', 'Color Intensity', 'Lumishine Demi', 'Lumishine Permanent',
  // CHI
  'Ionic Color', 'Ionic Shine', 'CHI Infra',
  // Clairol
  'Premium Creme', 'Beautiful Collection',
  // Rusk
  'Deepshine Permanent', 'Deepshine Demi', 'Deepshine Direct', 'Deepshine Boost',
  'Pure Pigments',
  // Redken
  'Shades EQ', 'Color Gels', 'Color Fusion', 'Flash Lift',
  // Wella
  'Color Touch', 'Blondor Freelights',
  // Matrix
  'Color Sync', 'Dream Age',
  // Goldwell
  'Topchic Zero',
  // Schwarzkopf
  'Royal Absolutes', 'BlondMe Bond',
  // Paul Mitchell
  'The Color', 'Pop XG', 'Shines XG', 'Color XG',
  // Kenra
  'Color Creative', 'Demi Permanent', 'Studio Stylist',
  // Pulp Riot
  'High Speed',
  // Pravana
  'Pure Light', 'Vivids Pastels', 'Vivids Everlasting', 'Vivids Jewels', 'Vivids Neons',
  // Framesi
  'Framcolor Futura', 'Framcolor Eclectic', 'Decolor B',
  // Lakme
  'K.Blonde', 'Collage Developer',
  // Keune
  'Tinta Color', 'Tinta Developer', 'Semi Color', 'Ultimate Blonde', 'Freedom Blonde',
  // Elgon
  'Moda & Styling', 'Decolorvit Plus',
  // Oligo
  'Calura Gloss', 'Calura Booster', 'Calura Developer', 'Blacklight Smart', 'Blacklight Blue',
  // Generic
  'Silk Infusion', 'Keratin Mist',
].sort((a, b) => b.length - a.length); // longest-first for greedy match

const SUB_LINE_THRESHOLD = 20;

/**
 * Extract the product line name from a product name string.
 * Tries known multi-word prefixes first, then falls back to extracting
 * the first word(s) before a shade number pattern (digit or #).
 */
export function extractProductLine(name: string): string {
  const trimmed = name.trim();

  // 1. Try known multi-word prefixes (case-insensitive)
  const lower = trimmed.toLowerCase();
  for (const prefix of KNOWN_MULTI_WORD_PREFIXES) {
    if (lower.startsWith(prefix.toLowerCase())) {
      // Return with original casing from the name
      return trimmed.slice(0, prefix.length).trim();
    }
  }

  // 2. Fallback: grab word(s) before the first shade number pattern
  //    A shade number typically starts with a digit, e.g. "7.0", "5N", "10B"
  const shadeMatch = trimmed.match(/^([A-Za-z][A-Za-z\s'-]*?)\s+\d/);
  if (shadeMatch) {
    return shadeMatch[1].trim();
  }

  // 3. Last resort: first word
  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace > 0) {
    return trimmed.slice(0, firstSpace);
  }

  return trimmed;
}

/**
 * Groups an array of items by their extracted product line.
 * Returns entries sorted alphabetically by line name.
 * Only groups if the total item count exceeds the threshold.
 */
export function groupByProductLine<T extends { name: string; product_line?: string | null }>(
  items: T[],
  threshold = SUB_LINE_THRESHOLD,
): { shouldGroup: boolean; groups: [string, T[]][] } {
  if (items.length < threshold) {
    return { shouldGroup: false, groups: [] };
  }

  const map = new Map<string, T[]>();
  for (const item of items) {
    const line = item.product_line || extractProductLine(item.name);
    if (!map.has(line)) map.set(line, []);
    map.get(line)!.push(item);
  }

  const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return { shouldGroup: true, groups };
}
