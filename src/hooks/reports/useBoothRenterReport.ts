import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface BoothRenterEntry {
  staffName: string;
  businessName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  insuranceVerified: boolean;
  insuranceExpiry: string | null;
  insuranceProvider: string | null;
}

export function useBoothRenterReport() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['booth-renter-report', orgId],
    queryFn: async (): Promise<BoothRenterEntry[]> => {
      const { data, error } = await supabase
        .from('booth_renter_profiles')
        .select('user_id, business_name, status, start_date, end_date, insurance_verified, insurance_expiry_date, insurance_provider')
        .eq('organization_id', orgId!);
      if (error) throw error;

      const { data: profiles } = await supabase.from('employee_profiles').select('user_id, full_name, display_name');
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || p.full_name || 'Unknown']));

      return (data || []).map(r => ({
        staffName: nameMap.get(r.user_id) || 'Unknown',
        businessName: r.business_name,
        status: r.status || 'unknown',
        startDate: r.start_date,
        endDate: r.end_date,
        insuranceVerified: r.insurance_verified ?? false,
        insuranceExpiry: r.insurance_expiry_date,
        insuranceProvider: r.insurance_provider,
      })).sort((a, b) => a.staffName.localeCompare(b.staffName));
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
