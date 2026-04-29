import { useMemo } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';

export type SchedulabilityReason = 'no_roles' | 'archived' | 'inactive' | 'unknown';

export interface SchedulabilityResult {
  schedulable: boolean;
  reason: SchedulabilityReason | null;
  warning: string | null;
}

const SCHEDULABLE: SchedulabilityResult = { schedulable: true, reason: null, warning: null };

/**
 * Returns whether a given staff member is currently schedulable, plus a
 * copy-governed warning string for soft-warn surfaces.
 *
 * Soft-warn doctrine (per onboarding completeness wave):
 *   - Unassigned roles, archived, or inactive members CAN still be scheduled
 *     by operators (we don't hard-block — that would push the problem upstream
 *     into onboarding sequences and Phorest sync). Instead, the consumer surface
 *     shows a toast with "Continue anyway" / "Assign role" actions.
 *   - This hook does NOT trigger any side effect — it's a pure derivation
 *     over the already-cached organization-users query, so wiring it into
 *     a surface adds zero round-trips.
 *
 * Public booking surfaces and Phorest sync MUST NOT consume this hook —
 * they are upstream of role assignment in real onboarding sequences.
 */
export function useStaffSchedulability(userId: string | null | undefined): SchedulabilityResult {
  const { effectiveOrganization } = useOrganizationContext();
  // Include archived so we can detect archived state explicitly rather than
  // returning `unknown` for users who exist but are filtered from the default roster.
  const { data: members, isLoading } = useOrganizationUsers(effectiveOrganization?.id, {
    includeArchived: true,
  });

  return useMemo<SchedulabilityResult>(() => {
    if (!userId) return SCHEDULABLE;
    if (isLoading || !members) return SCHEDULABLE; // Optimistic — never block on hook loading.

    const member = members.find((m) => m.user_id === userId);
    if (!member) {
      return {
        schedulable: false,
        reason: 'unknown',
        warning: 'This staff member is not in your organization roster.',
      };
    }

    if (member.archived_at) {
      return {
        schedulable: false,
        reason: 'archived',
        warning: 'This member is archived. Restore them before scheduling.',
      };
    }

    if (member.is_active === false) {
      return {
        schedulable: false,
        reason: 'inactive',
        warning: 'This member is inactive. Reactivate them before scheduling.',
      };
    }

    if (!member.roles || member.roles.length === 0) {
      return {
        schedulable: false,
        reason: 'no_roles',
        warning: 'This member has no role assigned yet. Schedule anyway?',
      };
    }

    return SCHEDULABLE;
  }, [members, isLoading, userId]);
}
