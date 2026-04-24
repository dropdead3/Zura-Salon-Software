import { useMemo } from 'react';
import { parseISO, format } from 'date-fns';
import type { ConflictingAppointment } from './useAssistantConflictCheck';

export type EligibilityTier = 'available' | 'conflicting' | 'off_today' | 'other_location';

export interface EligibleStylist {
  user_id: string;
  name: string;
  photo_url: string | null;
  tier: EligibilityTier;
  reasons: string[];
  conflicts: ConflictingAppointment[];
  is_lead: boolean;
}

interface TeamMember {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
  photo_url?: string | null;
  roles?: string[];
  location_schedules?: Record<string, string[]>;
}

interface Params {
  teamMembers: TeamMember[];
  conflictMap: Map<string, ConflictingAppointment[]>;
  appointmentDate: string | null;       // 'YYYY-MM-DD'
  locationId: string | null;
  leadStylistUserId?: string | null;
}

const SERVICE_PROVIDER_ROLES = new Set(['stylist', 'stylist_assistant', 'admin', 'booth_renter']);

function memberName(m: TeamMember): string {
  return m.display_name || m.full_name || 'Unknown';
}

/**
 * Ranks every potential service provider in the org into one of four tiers
 * for a specific appointment time block + location:
 *
 *   1. available       — Scheduled at this location today, no overlap
 *   2. conflicting     — Scheduled at this location today, overlaps another booking
 *   3. off_today       — Assigned to this location, not scheduled this day-of-week
 *   4. other_location  — Service provider in the org, not assigned to this location
 *
 * The lead stylist is included with `is_lead: true` and floated to the top of
 * whichever tier they land in (usually `conflicting` — they're the one being
 * reassigned away from).
 *
 * Doctrine: silence is valid. Empty tiers mean "no one matches" — the UI must
 * skip empty sections rather than render "0 available."
 */
export function useEligibleStylistsForService({
  teamMembers,
  conflictMap,
  appointmentDate,
  locationId,
  leadStylistUserId,
}: Params): EligibleStylist[] {
  return useMemo(() => {
    if (!appointmentDate) return [];

    const dayKey = format(parseISO(appointmentDate), 'EEE'); // 'Mon', 'Tue', ...

    const eligible: EligibleStylist[] = [];

    for (const m of teamMembers) {
      // Only show actual service providers
      if (!m.roles?.some(r => SERVICE_PROVIDER_ROLES.has(r))) continue;

      const conflicts = conflictMap.get(m.user_id) || [];
      const schedules = m.location_schedules || {};
      const assignedHere = locationId ? Array.isArray(schedules[locationId]) : false;
      const scheduledToday = assignedHere && (schedules[locationId!] || []).includes(dayKey);
      const isLead = leadStylistUserId === m.user_id;

      let tier: EligibilityTier;
      const reasons: string[] = [];

      if (scheduledToday && conflicts.length === 0) {
        tier = 'available';
        reasons.push('Scheduled · Free');
      } else if (scheduledToday && conflicts.length > 0) {
        tier = 'conflicting';
        reasons.push('Scheduled · Has conflict');
      } else if (assignedHere) {
        tier = 'off_today';
        reasons.push('Off today at this location');
      } else {
        tier = 'other_location';
        reasons.push('Other location');
      }

      if (isLead) reasons.unshift('Lead stylist');

      eligible.push({
        user_id: m.user_id,
        name: memberName(m),
        photo_url: m.photo_url || null,
        tier,
        reasons,
        conflicts,
        is_lead: isLead,
      });
    }

    // Sort: lead first within tier, then by name
    eligible.sort((a, b) => {
      if (a.is_lead !== b.is_lead) return a.is_lead ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return eligible;
  }, [teamMembers, conflictMap, appointmentDate, locationId, leadStylistUserId]);
}

/**
 * Bucket an eligibility list into ordered tier groups for the picker UI.
 * Empty groups are omitted (silence-is-valid).
 */
export function bucketByTier(list: EligibleStylist[]): Array<{
  tier: EligibilityTier;
  label: string;
  members: EligibleStylist[];
}> {
  const order: Array<{ tier: EligibilityTier; label: string }> = [
    { tier: 'available', label: 'Available now' },
    { tier: 'conflicting', label: 'Has conflicts' },
    { tier: 'off_today', label: 'Off today at this location' },
    { tier: 'other_location', label: 'Other staff in organization' },
  ];

  return order
    .map(({ tier, label }) => ({
      tier,
      label,
      members: list.filter(m => m.tier === tier),
    }))
    .filter(g => g.members.length > 0);
}
