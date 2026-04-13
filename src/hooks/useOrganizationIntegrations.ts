import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationIntegrationStatus {
  phorest: {
    connected: boolean;
    branchCount: number;
    staffMappingCount: number;
  };
  payroll: {
    connected: boolean;
    provider: 'gusto' | 'quickbooks' | null;
    connectedAt: string | null;
  };
}

export function useOrganizationIntegrations(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-integrations', organizationId],
    queryFn: async (): Promise<OrganizationIntegrationStatus> => {
      if (!organizationId) {
        return {
          phorest: { connected: false, branchCount: 0, staffMappingCount: 0 },
          payroll: { connected: false, provider: null, connectedAt: null },
        };
      }

      // Fetch Phorest and Payroll data in parallel
      // Split into separate queries to avoid deep type inference (TS2589)
      const phorestLocationsPromise = supabase
        .from('locations')
        .select('id, phorest_branch_id')
        .eq('organization_id', organizationId)
        .not('phorest_branch_id', 'is', null);

      const staffMappingPromise = supabase
        .from('phorest_staff_mapping')
        .select('id, is_active')
        .eq('is_active', true);

      const payrollPromise = supabase
        .from('payroll_connections')
        .select('provider, connection_status, connected_at')
        .eq('organization_id', organizationId)
        .maybeSingle();

      const [phorestResult, staffResult, payrollResult] = await Promise.all([
        phorestLocationsPromise,
        staffMappingPromise,
        payrollPromise,
      ]);

      // Process Phorest data
      const phorestData = phorestResult.data || [];
      const branchIds = new Set(phorestData.map(l => l.phorest_branch_id).filter(Boolean));
      const branchCount = branchIds.size;
      const staffMappingCount = (staffResult.data || []).length;

      // Process Payroll data
      const payrollData = payrollResult.data;
      const payrollConnected = payrollData?.connection_status === 'connected';

      return {
        phorest: {
          connected: branchCount > 0,
          branchCount,
          staffMappingCount,
        },
        payroll: {
          connected: payrollConnected,
          provider: payrollData?.provider as 'gusto' | 'quickbooks' | null,
          connectedAt: payrollData?.connected_at || null,
        },
      };
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
