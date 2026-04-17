/**
 * Shared level badge color utility.
 * Returns semantic-friendly Tailwind classes for stylist level badges,
 * progressing from neutral stone → warm amber → rich gold.
 */

const COLOR_STOPS = [
  { bg: 'bg-muted', text: 'text-muted-foreground' },
  { bg: 'bg-secondary', text: 'text-secondary-foreground' },
  { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
  { bg: 'bg-amber-200 dark:bg-amber-900/60', text: 'text-amber-900 dark:text-amber-200' },
  { bg: 'bg-amber-300 dark:bg-amber-800/70', text: 'text-amber-900 dark:text-amber-100' },
  { bg: 'bg-amber-500 dark:bg-amber-600', text: 'text-white dark:text-amber-50' },
] as const;

export function getLevelColor(index: number, totalLevels: number) {
  if (totalLevels <= 1) return COLOR_STOPS[COLOR_STOPS.length - 1];
  const ratio = index / (totalLevels - 1);
  const colorIndex = Math.round(ratio * (COLOR_STOPS.length - 1));
  return COLOR_STOPS[Math.min(colorIndex, COLOR_STOPS.length - 1)];
}
