/**
 * useLocationStylistCounts — Fetches the count of active stylists per location
 * for an organization. Used by the Backroom billing display.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationStylistCount {
  location_id: string;
  count: number;
}

/** Flat pricing constants for Backroom */
export const BACKROOM_BASE_PRICE = 20;
export const BACKROOM_PER_SERVICE_FEE = 0.50;
export const SCALE_LICENSE_MONTHLY = 10;
export const SCALE_HARDWARE_PRICE = 199;

export function useLocationStylistCounts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['location-stylist-counts', organizationId],
    queryFn: async (): Promise<LocationStylistCount[]> => {
      // Get all active employees with the stylist role in this org
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('user_id, location_id, location_ids')
        .eq('organization_id', organizationId!)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (empError) throw empError;

      // Get user_ids that have the 'stylist' role
      const userIds = (employees ?? []).map((e) => e.user_id);
      if (userIds.length === 0) return [];

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', userIds)
        .eq('role', 'stylist');

      if (roleError) throw roleError;

      const stylistUserIds = new Set((roles ?? []).map((r) => r.user_id));

      // Count stylists per location (handle both location_id and location_ids)
      const countMap = new Map<string, number>();

      for (const emp of employees ?? []) {
        if (!stylistUserIds.has(emp.user_id)) continue;

        const locIds: string[] = [];
        if (emp.location_id) locIds.push(emp.location_id);
        if (Array.isArray(emp.location_ids)) {
          for (const lid of emp.location_ids) {
            if (lid && !locIds.includes(lid)) locIds.push(lid);
          }
        }

        for (const lid of locIds) {
          countMap.set(lid, (countMap.get(lid) ?? 0) + 1);
        }
      }

      return Array.from(countMap.entries()).map(([location_id, count]) => ({
        location_id,
        count,
      }));
    },
    enabled: !!organizationId,
    staleTime: 2 * 60_000,
  });
}
