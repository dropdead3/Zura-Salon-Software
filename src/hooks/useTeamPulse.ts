import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Team Pulse — deterministic recognition + intervention triggers.
 *
 * Owner-facing operator primitive. Surfaces at most a handful of high-confidence
 * pulses derived from existing appointment signals. NO AI, NO predictions —
 * pure deterministic deltas honoring the {{PLATFORM_NAME}} doctrine.
 *
 * Recognition triggers (positive):
 *  - "On Fire": staff revenue this week ≥ 1.5× their trailing 4-week average
 *    AND ≥ $1k absolute (materiality threshold to avoid noise on slow weeks).
 *
 * Intervention triggers (concerning):
 *  - "Cold Streak": staff revenue this week ≤ 0.5× trailing 4-week average
 *    AND staff has ≥ 3 active weeks of history (not a new hire).
 *
 * Honors visibility contract: returns [] when nothing material — section
 * suppresses itself. Honors alert-fatigue doctrine: caps at 3 pulses total.
 */

export type PulseKind = 'recognition' | 'intervention';

export interface TeamPulse {
  id: string;
  kind: PulseKind;
  staffUserId: string | null;
  staffName: string;
  /** One-line headline. */
  headline: string;
  /** Single-line context — the math behind the call. */
  detail: string;
  /** Sortable magnitude — larger = louder. Used for ranking, never displayed. */
  magnitude: number;
}

const MAX_PULSES = 3;
const RECOGNITION_MULTIPLIER = 1.5;
const INTERVENTION_MULTIPLIER = 0.5;
const RECOGNITION_MIN_DOLLARS = 1000;
const MIN_HISTORY_WEEKS = 3;

interface AppointmentRow {
  staff_user_id: string | null;
  staff_name: string | null;
  total_price: number | null;
  appointment_date: string;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // make Monday = 0
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useTeamPulse(args: {
  enabled: boolean;
  locationId?: string;
  accessibleLocationIds?: string[];
}) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { enabled, locationId, accessibleLocationIds } = args;

  return useQuery({
    queryKey: ['team-pulse', orgId, locationId, accessibleLocationIds?.join(',')],
    queryFn: async (): Promise<TeamPulse[]> => {
      if (!orgId) return [];

      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const trailingStart = new Date(thisWeekStart);
      trailingStart.setDate(trailingStart.getDate() - 28); // 4 weeks before this week

      let query = supabase
        .from('appointments')
        .select('staff_user_id, staff_name, total_price, appointment_date')
        .eq('organization_id', orgId)
        .gte('appointment_date', isoDate(trailingStart))
        .lt('appointment_date', isoDate(new Date(thisWeekStart.getTime() + 7 * 86400000)))
        .in('status', ['completed', 'CONFIRMED', 'completed_paid'])
        .is('deleted_at', null)
        .limit(5000);

      if (locationId) {
        query = query.eq('location_id', locationId);
      } else if (accessibleLocationIds && accessibleLocationIds.length > 0) {
        query = query.in('location_id', accessibleLocationIds);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      // Aggregate per staff: thisWeek total + per-week trailing buckets.
      const byStaff = new Map<
        string,
        { name: string; thisWeek: number; weekly: Map<string, number> }
      >();

      const thisWeekKey = isoDate(thisWeekStart);

      for (const r of data as AppointmentRow[]) {
        const key = r.staff_user_id ?? `name:${r.staff_name ?? 'unknown'}`;
        if (!key || (key === 'name:unknown' && !r.staff_name)) continue;
        const dt = new Date(r.appointment_date);
        const wkKey = isoDate(startOfWeek(dt));
        const amount = Number(r.total_price ?? 0);
        if (!byStaff.has(key)) {
          byStaff.set(key, {
            name: r.staff_name ?? 'Team member',
            thisWeek: 0,
            weekly: new Map(),
          });
        }
        const bucket = byStaff.get(key)!;
        bucket.weekly.set(wkKey, (bucket.weekly.get(wkKey) ?? 0) + amount);
        if (wkKey === thisWeekKey) bucket.thisWeek += amount;
      }

      const pulses: TeamPulse[] = [];

      for (const [key, b] of byStaff.entries()) {
        // Trailing weeks (exclude current).
        const trailingWeeks: number[] = [];
        for (const [wk, total] of b.weekly.entries()) {
          if (wk !== thisWeekKey) trailingWeeks.push(total);
        }
        if (trailingWeeks.length < MIN_HISTORY_WEEKS) continue;

        const trailingAvg =
          trailingWeeks.reduce((s, v) => s + v, 0) / trailingWeeks.length;
        if (trailingAvg <= 0) continue;

        const ratio = b.thisWeek / trailingAvg;
        const userId = key.startsWith('name:') ? null : key;

        // Recognition
        if (ratio >= RECOGNITION_MULTIPLIER && b.thisWeek >= RECOGNITION_MIN_DOLLARS) {
          pulses.push({
            id: `recognition:${key}`,
            kind: 'recognition',
            staffUserId: userId,
            staffName: b.name,
            headline: `${b.name} is on fire`,
            detail: `${ratio.toFixed(1)}× their 4-week average this week`,
            magnitude: ratio * b.thisWeek,
          });
          continue;
        }

        // Intervention
        if (ratio <= INTERVENTION_MULTIPLIER) {
          pulses.push({
            id: `intervention:${key}`,
            kind: 'intervention',
            staffUserId: userId,
            staffName: b.name,
            headline: `${b.name} is in a cold streak`,
            detail: `Down to ${(ratio * 100).toFixed(0)}% of their 4-week average`,
            magnitude: (1 - ratio) * trailingAvg,
          });
        }
      }

      // Rank by magnitude, interventions slightly prioritized when tied.
      pulses.sort((a, b) => {
        if (b.magnitude !== a.magnitude) return b.magnitude - a.magnitude;
        if (a.kind === b.kind) return 0;
        return a.kind === 'intervention' ? -1 : 1;
      });

      return pulses.slice(0, MAX_PULSES);
    },
    enabled: enabled && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 min — weekly aggregate, no need to refetch often
  });
}
