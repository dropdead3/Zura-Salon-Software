/**
 * Single source of truth for date range labels and dynamic subtitles.
 * Import these instead of defining local DATE_RANGE_LABELS maps.
 */
import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns';

export type DateRangeType =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'thisWeek'
  | 'thisMonth'
  | 'todayToEom'
  | 'todayToPayday'
  | 'lastMonth'
  | 'ytd'
  | 'custom';

/** Canonical display labels — unambiguous naming. */
export const DATE_RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  thisWeek: 'Week to Date',
  thisMonth: 'Month to Date',
  todayToEom: 'Today → End of Month',
  todayToPayday: 'Today → Next Pay Day',
  lastMonth: 'Last Month',
  ytd: 'Year to Date',
  custom: 'Custom',
};

/**
 * Returns a short human-readable date span for the given range key,
 * e.g. "Mon, Feb 24 – Today" or "Mar 1 – Today".
 * Returns null when no subtitle adds value (e.g. "Today", "Yesterday", rolling windows).
 */
export function getDateRangeSubtitle(key: string): string | null {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'MMM d');

  switch (key) {
    case 'thisWeek': {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      return `${format(weekStart, 'EEE, MMM d')} – Today`;
    }
    case 'thisMonth': {
      const monthStart = startOfMonth(now);
      return `${fmt(monthStart)} – Today`;
    }
    case 'todayToEom': {
      const eom = endOfMonth(now);
      return `Today – ${fmt(eom)}`;
    }
    case 'todayToPayday': {
      // Generic subtitle — exact pay day depends on org config
      return 'Today – Next Pay Day';
    }
    case 'lastMonth': {
      const prev = subMonths(now, 1);
      const s = startOfMonth(prev);
      const e = endOfMonth(prev);
      return `${fmt(s)} – ${fmt(e)}`;
    }
    case 'ytd': {
      return `Jan 1 – Today`;
    }
    default:
      return null;
  }
}
