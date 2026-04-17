/**
 * Level pricing utilities.
 * These helpers work with stylist level strings (e.g. "LEVEL 3 STYLIST") used in
 * the scheduling / booking system. Price lookups now go through the database
 * via service_level_prices rather than the legacy static file.
 */

// Canonical slug type — matches stylist_levels.slug values in the DB
export type LevelSlug = string;

// Canonical 7-tier ladder mapping (matches stylist_levels.slug → display_order + 1)
const slugToLevelNumber: Record<string, number> = {
  'new-talent': 1,
  'studio-artist': 2,
  'emerging': 3,
  'lead': 4,
  'senior': 5,
  'signature': 6,
  'icon': 7,
};

// Reverse map for legacy "LEVEL N STYLIST" string fallback
const levelNumberToSlug: Record<number, string> = {
  1: 'new-talent',
  2: 'studio-artist',
  3: 'emerging',
  4: 'lead',
  5: 'senior',
  6: 'signature',
  7: 'icon',
};

/**
 * Resolves a stylist level value (slug or legacy "LEVEL N STYLIST" string) to its pricing slug.
 */
export function getLevelSlug(stylistLevel: string | null | undefined): string | null {
  if (!stylistLevel) return null;
  const normalized = stylistLevel.trim().toLowerCase();
  // 1. Already a known slug — pass through
  if (slugToLevelNumber[normalized] !== undefined) return normalized;
  // 2. Legacy "LEVEL N STYLIST" format — parse and remap
  const match = stylistLevel.match(/LEVEL\s*(\d+)/i);
  if (match) {
    const levelNum = parseInt(match[1], 10);
    return levelNumberToSlug[levelNum] || null;
  }
  return null;
}

/**
 * Resolves a stylist level value (slug or legacy "LEVEL N STYLIST" string) to its tier number.
 */
export function getLevelNumber(stylistLevel: string | null | undefined): number | null {
  if (!stylistLevel) return null;
  const normalized = stylistLevel.trim().toLowerCase();
  // 1. Slug-native lookup
  if (slugToLevelNumber[normalized] !== undefined) return slugToLevelNumber[normalized];
  // 2. Legacy "LEVEL N STYLIST" format
  const match = stylistLevel.match(/LEVEL\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Finds the level-based price for a service using pre-fetched data.
 * @param levelPrices - Map of stylist_level_id → price (from service_level_prices table)
 * @param levels - Array of { id, slug } from stylist_levels table
 * @param levelSlug - The slug to look up (e.g. 'emerging')
 * @returns The numeric price or null if not found
 */
export function findLevelPrice(
  levelPrices: Record<string, number>,
  levels: Array<{ id: string; slug: string }>,
  levelSlug: string,
): number | null {
  const level = levels.find(l => l.slug === levelSlug);
  if (!level) return null;
  const price = levelPrices[level.id];
  return price !== undefined ? price : null;
}

/**
 * Gets a display label for a level number (e.g. "Level 3").
 */
export function getLevelLabel(levelNumber: number): string {
  return `Level ${levelNumber}`;
}
