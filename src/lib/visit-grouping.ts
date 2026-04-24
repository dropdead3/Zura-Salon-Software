/**
 * Visit grouping — collapse multiple per-service appointment rows for the same
 * client into a single visit at the read/render layer.
 *
 * DOCTRINE: Phorest stores one row per service but its UI groups contiguous
 * services for the same client into a single appointment block. Zura mirrors
 * that operator mental model without changing the underlying data: one row
 * per service stays the source of truth (commission, per-service stylist
 * overrides, status transitions all remain row-scoped); the merge happens
 * here, at the boundary between data and view.
 *
 * Strict grouping rules (all must be true to merge):
 *   1. Same client (phorest_client_id OR client_id; never both null)
 *   2. Same location_id
 *   3. Same appointment_date
 *   4. Contiguous in time — gap between previous end_time and current
 *      start_time ≤ MAX_VISIT_GAP_MINUTES
 *
 * Walk-ins (no client linkage) NEVER merge, even back-to-back. Truthful per
 * signal-preservation: "two separate walk-ins" is operationally distinct
 * from "one walk-in with two services" and we don't have the data to know
 * which is which when both keys are null.
 */

import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import { parseTimeToMinutes } from '@/lib/schedule-utils';

/** Max gap (minutes) between end of one service and start of the next to still merge. */
export const MAX_VISIT_GAP_MINUTES = 5;

export interface VisitGroup {
  visit_id: string;
  client_key: string;
  client_name: string | null;
  client_phone: string | null;
  appointment_date: string;
  location_id: string | null;
  start_time: string;
  end_time: string;
  total_price: number | null;
  total_duration_minutes: number;
  members: PhorestAppointment[];
  member_ids: string[];
  is_multi_service: boolean;
  lead_stylist_user_id: string | null;
  stylist_user_ids: string[];
}

/**
 * PhorestAppointment with optional visit-merge metadata. The display path
 * synthesizes one of these per visit; consumers that ignore the underscore
 * fields treat it like any other appointment.
 */
export interface MergedPhorestAppointment extends PhorestAppointment {
  _visit_id?: string;
  _visit_member_ids?: string[];
  _visit_members?: PhorestAppointment[];
  _is_merged_visit?: boolean;
}

function getClientKey(apt: PhorestAppointment): string | null {
  return apt.phorest_client_id || (apt as any).client_id || null;
}

function durationMinutes(start: string, end: string): number {
  return Math.max(0, parseTimeToMinutes(end) - parseTimeToMinutes(start));
}

/**
 * Walk + group appointments into VisitGroups using strict contiguity rules.
 * Input does NOT need to be pre-sorted; output groups are deterministic.
 */
export function groupAppointmentsIntoVisits(
  appointments: PhorestAppointment[],
): VisitGroup[] {
  if (appointments.length === 0) return [];

  // Sort once: client → location → date → start_time
  const sorted = [...appointments].sort((a, b) => {
    const aKey = getClientKey(a) ?? '';
    const bKey = getClientKey(b) ?? '';
    if (aKey !== bKey) return aKey.localeCompare(bKey);
    const aLoc = a.location_id ?? '';
    const bLoc = b.location_id ?? '';
    if (aLoc !== bLoc) return aLoc.localeCompare(bLoc);
    if (a.appointment_date !== b.appointment_date) {
      return a.appointment_date.localeCompare(b.appointment_date);
    }
    return a.start_time.localeCompare(b.start_time);
  });

  const groups: VisitGroup[] = [];
  let bucket: PhorestAppointment[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    groups.push(buildVisitGroup(bucket));
    bucket = [];
  };

  for (const apt of sorted) {
    const clientKey = getClientKey(apt);
    // Walk-ins never merge → each becomes its own (single-member) group.
    if (!clientKey) {
      flush();
      groups.push(buildVisitGroup([apt]));
      continue;
    }

    if (bucket.length === 0) {
      bucket.push(apt);
      continue;
    }

    const last = bucket[bucket.length - 1];
    const sameClient = getClientKey(last) === clientKey;
    const sameLocation = (last.location_id ?? '') === (apt.location_id ?? '');
    const sameDate = last.appointment_date === apt.appointment_date;
    const gap = parseTimeToMinutes(apt.start_time) - parseTimeToMinutes(last.end_time);
    const contiguous = gap >= 0 && gap <= MAX_VISIT_GAP_MINUTES;

    if (sameClient && sameLocation && sameDate && contiguous) {
      bucket.push(apt);
    } else {
      flush();
      bucket.push(apt);
    }
  }
  flush();

  return groups;
}

function buildVisitGroup(members: PhorestAppointment[]): VisitGroup {
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

  // Lead stylist: longest-duration contributor; tie-break = first member.
  const stylistDuration = new Map<string, number>();
  for (const m of sorted) {
    if (!m.stylist_user_id) continue;
    const d = durationMinutes(m.start_time, m.end_time);
    stylistDuration.set(m.stylist_user_id, (stylistDuration.get(m.stylist_user_id) ?? 0) + d);
  }
  let leadStylistId: string | null = first.stylist_user_id ?? null;
  let bestDuration = leadStylistId ? (stylistDuration.get(leadStylistId) ?? 0) : 0;
  stylistDuration.forEach((d, id) => {
    if (d > bestDuration) {
      bestDuration = d;
      leadStylistId = id;
    }
  });

  const stylistIds = Array.from(
    new Set(sorted.map((m) => m.stylist_user_id).filter(Boolean) as string[]),
  );

  const memberIds = sorted.map((m) => m.id);
  const visit_id = `visit_${memberIds.join('_')}`;
  const clientKey = getClientKey(first) ?? `walkin_${first.id}`;

  return {
    visit_id,
    client_key: clientKey,
    client_name: first.client_name ?? null,
    client_phone: first.client_phone ?? null,
    appointment_date: first.appointment_date,
    location_id: first.location_id ?? null,
    start_time: first.start_time,
    end_time: last.end_time,
    total_price: totalPrice,
    total_duration_minutes: totalDuration,
    members: sorted,
    member_ids: memberIds,
    is_multi_service: sorted.length > 1,
    lead_stylist_user_id: leadStylistId,
    stylist_user_ids: stylistIds,
  };
}

/**
 * Convert visit groups into a flat list of `MergedPhorestAppointment` rows
 * suitable for the existing schedule renderers. Single-member visits pass
 * through unchanged; multi-member visits become one synthetic row that
 * spans the full visit window with comma-joined service names.
 *
 * The synthetic row uses the lead member's `id` so existing
 * `selectedAppointmentId` checks, deep-link focus, and per-row caches keep
 * resolving naturally.
 */
export function buildDisplayAppointments(
  appointments: PhorestAppointment[],
): MergedPhorestAppointment[] {
  const groups = groupAppointmentsIntoVisits(appointments);

  return groups.map<MergedPhorestAppointment>((g) => {
    if (!g.is_multi_service) {
      const only = g.members[0] as MergedPhorestAppointment;
      return {
        ...only,
        _visit_id: g.visit_id,
        _visit_member_ids: g.member_ids,
        _visit_members: g.members,
        _is_merged_visit: false,
      };
    }

    const leadMember =
      g.members.find((m) => m.stylist_user_id === g.lead_stylist_user_id) ?? g.members[0];

    const serviceName = g.members.map((m) => m.service_name).join(', ');

    const latestUpdate = g.members
      .map((m) => m.updated_at)
      .sort()
      .reverse()[0];

    return {
      ...leadMember,
      start_time: g.start_time,
      end_time: g.end_time,
      service_name: serviceName,
      total_price: g.total_price,
      updated_at: latestUpdate,
      _visit_id: g.visit_id,
      _visit_member_ids: g.member_ids,
      _visit_members: g.members,
      _is_merged_visit: true,
    };
  });
}

/** Convenience: index visits by their synthetic row id (= lead member id). */
export function indexVisitsByDisplayId(
  appointments: PhorestAppointment[],
): Map<string, VisitGroup> {
  const groups = groupAppointmentsIntoVisits(appointments);
  const map = new Map<string, VisitGroup>();
  for (const g of groups) {
    const lead =
      g.members.find((m) => m.stylist_user_id === g.lead_stylist_user_id) ?? g.members[0];
    map.set(lead.id, g);
  }
  return map;
}
