import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';

export interface StaffScheduleBlock {
  id: string;
  user_id: string | null;
  phorest_staff_id: string | null;
  location_id: string | null;
  block_date: string;
  start_time: string;
  end_time: string;
  block_type: string;
  label: string | null;
  source: string;
  organization_id: string;
}

/**
 * Fetches staff schedule blocks (breaks, lunches, blocked time) for a date range.
 * Used by DayView and WeekView to render non-appointment blocks on the calendar.
 *
 * Handles backwards-compatibility: queries both the app location ID and the
 * legacy Phorest branch ID so existing un-backfilled rows are still visible.
 */
export function useStaffScheduleBlocks(
  dateFrom: Date,
  dateTo?: Date,
  locationId?: string,
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const fromStr = format(dateFrom, 'yyyy-MM-dd');
  const toStr = format(dateTo ?? dateFrom, 'yyyy-MM-dd');

  // Resolve the phorest_branch_id for the selected location so we can also
  // match legacy rows that still store the raw branch ID.
  const { data: locationRow } = useQuery({
    queryKey: ['location-branch-id', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data } = await supabase
        .from('locations')
        .select('phorest_branch_id')
        .eq('id', locationId)
        .maybeSingle();
      return data;
    },
    enabled: !!locationId,
    staleTime: 5 * 60_000, // branch mapping rarely changes
  });

  const phorestBranchId = locationRow?.phorest_branch_id;

  return useQuery({
    queryKey: ['staff-schedule-blocks', orgId, fromStr, toStr, locationId, phorestBranchId],
    queryFn: async () => {
      let query = supabase
        .from('staff_schedule_blocks')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('block_date', fromStr)
        .lte('block_date', toStr);

      if (locationId) {
        // Match both app location ID and legacy Phorest branch ID
        const locationIds = [locationId];
        if (phorestBranchId) locationIds.push(phorestBranchId);
        query = query.in('location_id', locationIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StaffScheduleBlock[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
