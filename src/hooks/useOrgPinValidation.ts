import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PinValidationResult {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  is_super_admin: boolean;
  is_primary_owner: boolean;
}

/**
 * Provider-free PIN validation. Takes organizationId directly so it can run
 * on routes that live OUTSIDE OrganizationProvider (e.g. /org/:slug/login).
 *
 * Mirrors the kiosk-side validation pattern (useKioskValidatePin).
 */
export function useOrgValidatePin(organizationId: string | null | undefined) {
  return useMutation({
    mutationFn: async (pin: string): Promise<PinValidationResult | null> => {
      if (!organizationId) throw new Error('No organization context');
      if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');

      const { data, error } = await supabase.rpc('validate_user_pin', {
        _organization_id: organizationId,
        _pin: pin,
      });

      if (error) throw error;
      return data && data.length > 0 ? (data[0] as PinValidationResult) : null;
    },
  });
}

interface OrgTeamMember {
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  has_pin: boolean;
}

/**
 * Provider-free roster fetch for the shared-device avatar grid.
 * Returns only members who have a PIN set (others can't sign in via PIN anyway).
 *
 * Optional `locationId` filters the roster to only staff assigned to that
 * location (via employee_profiles.location_ids). Used by the per-location
 * login route /org/:slug/loc/:locId/login.
 */
export function useOrgTeamForLogin(
  organizationId: string | null | undefined,
  locationId?: string | null,
) {
  return useQuery({
    queryKey: ['org-login-team', organizationId, locationId ?? null],
    queryFn: async (): Promise<OrgTeamMember[]> => {
      if (!organizationId) return [];

      let query = supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url, location_id, location_ids')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('full_name');

      if (locationId) {
        // Match either the primary location_id or membership in location_ids[]
        query = query.or(`location_id.eq.${locationId},location_ids.cs.{${locationId}}`);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      const { data: pinStatuses, error: pinError } = await supabase.rpc(
        'get_team_pin_statuses',
        { _organization_id: organizationId },
      );
      if (pinError) throw pinError;

      const pinMap = new Map(
        (pinStatuses || []).map((s: { user_id: string; has_pin: boolean }) => [
          s.user_id,
          s.has_pin,
        ]),
      );

      return (profiles || [])
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name || '',
          display_name: p.display_name,
          photo_url: p.photo_url,
          has_pin: pinMap.get(p.user_id) || false,
        }))
        .filter((p) => p.has_pin);
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}
