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

  return useQuery({
    queryKey: ['staff-schedule-blocks', orgId, fromStr, toStr, locationId],
    queryFn: async () => {
      let query = supabase
        .from('staff_schedule_blocks')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('block_date', fromStr)
        .lte('block_date', toStr);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StaffScheduleBlock[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
