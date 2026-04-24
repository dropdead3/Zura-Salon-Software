/**
 * Client-history visit grouping — collapses per-service `ClientVisit` rows
 * (from `useClientVisitHistory`) into visit-level groups for the read path.
 *
 * Mirrors the schedule-side `visit-grouping.ts` doctrine: the database keeps
 * one row per service, but the operator mental model is "one visit, however
 * many services were rendered." Counting service rows as visits inflates
 * frequency metrics and breaks parity with Phorest's own timeline.
 *
 * Strict grouping rules (all must hold to merge):
 *   1. Same client (we're already scoped to one client at the hook level)
 *   2. Same `appointment_date`
 *   3. Contiguous in time — gap between previous `end_time` and current
 *      `start_time` ≤ MAX_VISIT_GAP_MINUTES
 *
 * NOTE: `ClientVisit` doesn't expose `location_id`. In practice a single
 * client almost never has same-day appointments at two locations; if they
 * do, the time gap virtually guarantees a non-merge. We document the gap
 * here so a future schema change (adding `location_id` to the view) can
 * tighten the rule without surprise.
 */
import type { ClientVisit } from '@/hooks/useClientVisitHistory';
import { parseTimeToMinutes } from '@/lib/schedule-utils';

export const MAX_VISIT_GAP_MINUTES = 5;

export interface ClientVisitGroup {
  visit_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  total_price: number | null;
  total_duration_minutes: number;
  members: ClientVisit[];
  is_multi_service: boolean;
  /** Lead service = longest duration; tie-breaker = first scheduled. */
  lead: ClientVisit;
  /** Distinct stylist names (in scheduled order). */
  stylist_names: string[];
  /** Aggregate status: any non-cancelled member wins; all-cancelled → cancelled. */
  status: string;
  /** Combined notes from all members (newest first). */
  combined_notes: string | null;
}

function durationMinutes(start: string, end: string): number {
  return Math.max(0, parseTimeToMinutes(end) - parseTimeToMinutes(start));
}

/**
 * Treat a visit as "completed-ish" for status precedence: a single completed
 * service inside an otherwise-cancelled group still represents a real visit.
 */
const STATUS_PRECEDENCE = ['completed', 'checked_in', 'confirmed', 'booked', 'no_show', 'cancelled'];

function pickAggregateStatus(members: ClientVisit[]): string {
  const present = new Set(members.map((m) => m.status));
  for (const s of STATUS_PRECEDENCE) {
    if (present.has(s)) return s;
  }
  return members[0]?.status ?? 'booked';
}

export function groupClientVisits(visits: ClientVisit[]): ClientVisitGroup[] {
  if (visits.length === 0) return [];

  // Sort: date asc, then start_time asc (we'll reverse for newest-first display later).
  const sorted = [...visits].sort((a, b) => {
    if (a.appointment_date !== b.appointment_date) {
      return a.appointment_date.localeCompare(b.appointment_date);
    }
    return a.start_time.localeCompare(b.start_time);
  });

  const groups: ClientVisitGroup[] = [];
  let bucket: ClientVisit[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    groups.push(buildGroup(bucket));
    bucket = [];
  };

  for (const v of sorted) {
    if (bucket.length === 0) {
      bucket.push(v);
      continue;
    }
    const last = bucket[bucket.length - 1];
    const sameDate = last.appointment_date === v.appointment_date;
    const gap = parseTimeToMinutes(v.start_time) - parseTimeToMinutes(last.end_time);
    const contiguous = gap >= 0 && gap <= MAX_VISIT_GAP_MINUTES;
    if (sameDate && contiguous) {
      bucket.push(v);
    } else {
      flush();
      bucket.push(v);
    }
  }
  flush();

  return groups;
}

function buildGroup(members: ClientVisit[]): ClientVisitGroup {
  const sorted = [...members].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const totalPrice = sorted.reduce<number | null>((acc, m) => {
    if (m.total_price == null) return acc;
    return (acc ?? 0) + m.total_price;
  }, null);

  const totalDuration = sorted.reduce(
    (sum, m) => sum + durationMinutes(m.start_time, m.end_time),
    0,
  );

  // Lead = longest service; ties broken by scheduled order.
  let lead = sorted[0];
  let bestDur = durationMinutes(lead.start_time, lead.end_time);
  for (const m of sorted.slice(1)) {
    const d = durationMinutes(m.start_time, m.end_time);
    if (d > bestDur) {
      bestDur = d;
      lead = m;
    }
  }

  const stylistNames = Array.from(
    new Set(sorted.map((m) => m.stylist_name).filter((n): n is string => !!n)),
  );

  const noteLines = sorted
    .map((m) => m.notes?.trim())
    .filter((n): n is string => !!n);
  const combined_notes = noteLines.length === 0 ? null : noteLines.join('\n');

  return {
    visit_id: `visit_${sorted.map((m) => m.id).join('_')}`,
    appointment_date: first.appointment_date,
    start_time: first.start_time,
    end_time: last.end_time,
    total_price: totalPrice,
    total_duration_minutes: totalDuration,
    members: sorted,
    is_multi_service: sorted.length > 1,
    lead,
    stylist_names: stylistNames,
    status: pickAggregateStatus(sorted),
    combined_notes,
  };
}

/** Quick visit count (number of distinct visit groups, optionally filtered). */
export function countVisits(
  visits: ClientVisit[],
  predicate?: (g: ClientVisitGroup) => boolean,
): number {
  const groups = groupClientVisits(visits);
  return predicate ? groups.filter(predicate).length : groups.length;
}
