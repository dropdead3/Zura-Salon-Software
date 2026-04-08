import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { parseISO, differenceInDays, setYear, format, differenceInYears } from 'date-fns';

export interface StaffMilestoneEntry {
  staffName: string;
  type: 'birthday' | 'anniversary';
  date: string;
  daysUntil: number;
  years: number | null;
  locationId: string | null;
}

interface Filters {
  daysAhead?: number;
  milestoneType?: 'birthday' | 'anniversary' | 'both';
  locationId?: string;
}

export function useStaffMilestonesReport(filters: Filters = {}) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const daysAhead = filters.daysAhead ?? 30;
  const milestoneType = filters.milestoneType ?? 'both';

  return useQuery({
    queryKey: ['staff-milestones-report', orgId, filters],
    queryFn: async (): Promise<StaffMilestoneEntry[]> => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('full_name, display_name, birthday, hire_date, location_id, is_active')
        .eq('is_active', true);
      if (error) throw error;

      const today = new Date();
      const currentYear = today.getFullYear();
      const results: StaffMilestoneEntry[] = [];

      for (const ep of data || []) {
        if (filters.locationId && ep.location_id !== filters.locationId) continue;
        const name = ep.display_name || ep.full_name || 'Unknown';

        if (milestoneType !== 'anniversary' && ep.birthday) {
          const bday = parseISO(ep.birthday);
          let thisYear = setYear(bday, currentYear);
          if (thisYear < today) thisYear = setYear(bday, currentYear + 1);
          const days = differenceInDays(thisYear, today);
          if (days >= 0 && days <= daysAhead) {
            results.push({ staffName: name, type: 'birthday', date: format(bday, 'MMM d'), daysUntil: days, years: null, locationId: ep.location_id });
          }
        }

        if (milestoneType !== 'birthday' && ep.hire_date) {
          const hireDate = parseISO(ep.hire_date);
          let thisYear = setYear(hireDate, currentYear);
          if (thisYear < today) thisYear = setYear(hireDate, currentYear + 1);
          const days = differenceInDays(thisYear, today);
          if (days >= 0 && days <= daysAhead) {
            const years = differenceInYears(thisYear, hireDate);
            results.push({ staffName: name, type: 'anniversary', date: format(hireDate, 'MMM d'), daysUntil: days, years, locationId: ep.location_id });
          }
        }
      }

      return results.sort((a, b) => a.daysUntil - b.daysUntil);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
