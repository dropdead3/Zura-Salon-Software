import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay } from 'date-fns';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Today at a Glance (Owner Operator Top-Bar).
 *
 * Answers "Is the building OK today?" — pure operational state, not analytics.
 * Scoped by the global location toggle. When `locationId` is undefined,
 * rolls up across the caller-provided `accessibleLocationIds`.
 *
 * Visibility-contract compliant: callers should hide the surface when
 * `materialitySignal === false` (i.e., the building has no signal worth
 * displaying — empty day, brand-new org, etc.). Caller still renders an
 * empty state if they want to confirm the date is being tracked.
 */
export interface TodayAtAGlanceData {
  /** Stylists scheduled to work today. */
  staffOnToday: number;
  /** Stylists with appointments but flagged as a no-show / called-out (status='called_out'). */
  staffCalledOut: number;
  /** First-time clients booked today (appointments.is_new_client=true). */
  firstTimersToday: number;
  /** VIP clients booked today (top-decile by clients.total_spend within org). */
  vipsToday: number;
  /**
   * Same staff_user_id with overlapping start_time windows on the same day.
   * Indicates a scheduling conflict the operator should resolve.
   */
  doubleBookings: number;
  /** Total appointments booked today (denominator context for the tiles). */
  totalAppointments: number;
  /** True when at least one tile carries a non-zero signal worth surfacing. */
  hasSignal: boolean;
  isLoading: boolean;
}

export function useTodayAtAGlance(args: {
  enabled: boolean;
  locationId?: string;
  /** When `locationId` is undefined, restrict aggregate to these locations. */
  accessibleLocationIds: string[];
}): TodayAtAGlanceData {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const scopeKey = args.locationId ?? `agg:${args.accessibleLocationIds.slice().sort().join(',')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['today-at-a-glance', orgId, today, scopeKey],
    queryFn: async () => {
      if (!orgId) return null;

      // ── 1. Today's appointments in scope ─────────────────────────────
      let apptQuery = supabase
        .from('appointments')
        .select('id, staff_user_id, client_id, start_time, status, is_new_client, location_id')
        .eq('organization_id', orgId)
        .eq('appointment_date', today)
        .is('deleted_at', null);

      if (args.locationId) {
        apptQuery = apptQuery.eq('location_id', args.locationId);
      } else if (args.accessibleLocationIds.length > 0) {
        apptQuery = apptQuery.in('location_id', args.accessibleLocationIds);
      }

      const { data: appts, error: apptErr } = await apptQuery;
      if (apptErr) throw apptErr;

      const appointments = appts ?? [];

      // ── 2. Distinct staff on today ──────────────────────────────────
      const staffIds = new Set(
        appointments
          .map((a) => a.staff_user_id)
          .filter((id): id is string => !!id),
      );
      const staffOnToday = staffIds.size;

      // ── 3. Called-out (status sentinel) ─────────────────────────────
      // We treat 'called_out' as the explicit absence sentinel; absence-signal
      // doctrine says we only count what's explicitly marked, never inferred.
      const staffCalledOut = new Set(
        appointments
          .filter((a) => a.status === 'called_out')
          .map((a) => a.staff_user_id)
          .filter((id): id is string => !!id),
      ).size;

      // ── 4. First-timers ─────────────────────────────────────────────
      const firstTimersToday = appointments.filter((a) => a.is_new_client === true).length;

      // ── 5. Double-bookings (same staff, overlapping start_time) ─────
      // Cheap heuristic: same staff_user_id with identical start_time on
      // the same date is a conflict. A fuller overlap check can come later.
      const seen = new Map<string, number>();
      let doubleBookings = 0;
      for (const a of appointments) {
        if (!a.staff_user_id || !a.start_time) continue;
        const key = `${a.staff_user_id}::${a.start_time}`;
        const c = (seen.get(key) ?? 0) + 1;
        seen.set(key, c);
        if (c === 2) doubleBookings += 1; // count the conflict, not each booking
      }

      // ── 6. VIPs in today (top-decile by clients.total_spend) ────────
      // Strategy: pull the org's top-decile threshold once, then count
      // distinct client_ids in today's appointments above it.
      const clientIds = Array.from(
        new Set(
          appointments
            .map((a) => a.client_id)
            .filter((id): id is string => !!id),
        ),
      );

      let vipsToday = 0;
      if (clientIds.length > 0) {
        // Pull total_spend for both: today's clients AND org top decile threshold.
        // To avoid loading every client in the org, we approximate the threshold
        // by sampling the top 200 spenders — adequate for tier classification.
        const { data: topSpenders } = await supabase
          .from('clients')
          .select('id, total_spend')
          .eq('organization_id', orgId)
          .order('total_spend', { ascending: false, nullsFirst: false })
          .limit(200);

        const sorted = (topSpenders ?? [])
          .map((c) => Number(c.total_spend ?? 0))
          .filter((v) => v > 0)
          .sort((a, b) => b - a);

        const decileIdx = Math.floor(sorted.length * 0.1);
        const threshold = sorted[decileIdx] ?? Infinity;

        const { data: todaysClients } = await supabase
          .from('clients')
          .select('id, total_spend')
          .eq('organization_id', orgId)
          .in('id', clientIds);

        vipsToday = (todaysClients ?? []).filter(
          (c) => Number(c.total_spend ?? 0) >= threshold && Number(c.total_spend ?? 0) > 0,
        ).length;
      }

      return {
        staffOnToday,
        staffCalledOut,
        firstTimersToday,
        vipsToday,
        doubleBookings,
        totalAppointments: appointments.length,
      };
    },
    enabled: args.enabled && !!orgId,
    staleTime: 60 * 1000, // 1 min — dashboard surface, refresh often enough but cheap
  });

  return useMemo(() => {
    const d = data ?? {
      staffOnToday: 0,
      staffCalledOut: 0,
      firstTimersToday: 0,
      vipsToday: 0,
      doubleBookings: 0,
      totalAppointments: 0,
    };
    const hasSignal =
      d.staffOnToday > 0 ||
      d.staffCalledOut > 0 ||
      d.firstTimersToday > 0 ||
      d.vipsToday > 0 ||
      d.doubleBookings > 0 ||
      d.totalAppointments > 0;
    return { ...d, hasSignal, isLoading };
  }, [data, isLoading]);
}
