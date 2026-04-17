/**
 * rebook-recommender.ts — Pure functions for computing smart rebook intervals
 * based on service type/category. Returns concrete suggested dates.
 */

import { addWeeks, format } from 'date-fns';

export interface RebookInterval {
  weeks: number;
  label: string;
  date: Date;
  dateLabel: string;
}

interface IntervalConfig {
  weeks: number[];
  label: string;
}

const CATEGORY_INTERVALS: Record<string, IntervalConfig> = {
  color: { weeks: [6, 8], label: 'Color Touch-Up' },
  colour: { weeks: [6, 8], label: 'Colour Touch-Up' },
  highlights: { weeks: [8, 10], label: 'Highlight Refresh' },
  highlight: { weeks: [8, 10], label: 'Highlight Refresh' },
  balayage: { weeks: [10, 12], label: 'Balayage Refresh' },
  cut: { weeks: [4, 6], label: 'Next Haircut' },
  haircut: { weeks: [4, 6], label: 'Next Haircut' },
  blowout: { weeks: [2, 3], label: 'Next Blowout' },
  treatment: { weeks: [4, 6], label: 'Next Treatment' },
  keratin: { weeks: [12, 16], label: 'Keratin Refresh' },
  extensions: { weeks: [6, 8], label: 'Extension Maintenance' },
};

const SERVICE_NAME_PATTERNS: [RegExp, IntervalConfig][] = [
  [/balayage/i, { weeks: [10, 12], label: 'Balayage Refresh' }],
  [/highlight|foil/i, { weeks: [8, 10], label: 'Highlight Refresh' }],
  [/root|touch.?up|single.?process|all.?over/i, { weeks: [4, 6], label: 'Color Touch-Up' }],
  [/col(o|ou)r/i, { weeks: [6, 8], label: 'Color Service' }],
  [/keratin|smoothing/i, { weeks: [12, 16], label: 'Keratin Refresh' }],
  [/extension/i, { weeks: [6, 8], label: 'Extension Maintenance' }],
  [/blow.?out|blow.?dry/i, { weeks: [2, 3], label: 'Next Blowout' }],
  [/cut|trim/i, { weeks: [4, 6], label: 'Next Haircut' }],
];

const DEFAULT_INTERVAL: IntervalConfig = { weeks: [4, 6], label: 'Next Visit' };

export const REBOOK_INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12] as const;

function resolveInterval(
  serviceName: string | null | undefined,
  serviceCategory: string | null | undefined,
): IntervalConfig {
  // Try category first
  if (serviceCategory) {
    const key = serviceCategory.toLowerCase().trim();
    if (CATEGORY_INTERVALS[key]) return CATEGORY_INTERVALS[key];
  }

  // Try service name patterns
  if (serviceName) {
    for (const [pattern, config] of SERVICE_NAME_PATTERNS) {
      if (pattern.test(serviceName)) return config;
    }
  }

  return DEFAULT_INTERVAL;
}

export function getRecommendedRebookIntervals(
  serviceName: string | null | undefined,
  serviceCategory: string | null | undefined,
  fromDate: Date = new Date(),
): RebookInterval[] {
  const config = resolveInterval(serviceName, serviceCategory);

  return config.weeks.map(weeks => {
    const date = addWeeks(fromDate, weeks);
    return {
      weeks,
      label: `Book ${weeks} Weeks`,
      date,
      dateLabel: format(date, 'MMM d'),
    };
  });
}

export function getRebookServiceLabel(
  serviceName: string | null | undefined,
  serviceCategory: string | null | undefined,
): string {
  return resolveInterval(serviceName, serviceCategory).label;
}
