import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface StaffStrikeEntry {
  staffName: string;
  strikeType: string;
  severity: string;
  title: string;
  incidentDate: string;
  isResolved: boolean;
  resolutionNotes: string | null;
}

interface Filters { dateFrom: string; dateTo: string; locationId?: string; }

export function useStaffStrikesReport(filters: Filters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['staff-strikes-report', orgId, filters],
    queryFn: async (): Promise<StaffStrikeEntry[]> => {
      // First fetch org-scoped employee profiles to build allowlist
      let profileQuery = supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .eq('organization_id', orgId!);

      if (filters.locationId) {
        profileQuery = profileQuery.eq('location_id', filters.locationId);
      }

      const { data: profiles, error: profileError } = await profileQuery;
      if (profileError) throw profileError;

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || p.full_name || 'Unknown']));
      const orgUserIds = Array.from(nameMap.keys());

      if (orgUserIds.length === 0) return [];

      const { data: strikes, error } = await supabase
        .from('staff_strikes')
        .select('user_id, strike_type, severity, title, incident_date, is_resolved, resolution_notes')
        .in('user_id', orgUserIds)
        .gte('incident_date', filters.dateFrom)
        .lte('incident_date', filters.dateTo);
      if (error) throw error;

      return (strikes || []).map(s => ({
        staffName: nameMap.get(s.user_id) || 'Unknown',
        strikeType: s.strike_type || 'General',
        severity: s.severity || 'Medium',
        title: s.title || 'Untitled',
        incidentDate: s.incident_date || '',
        isResolved: s.is_resolved ?? false,
        resolutionNotes: s.resolution_notes,
      })).sort((a, b) => b.incidentDate.localeCompare(a.incidentDate));
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
