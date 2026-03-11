import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInDays, addDays, format } from 'date-fns';

export interface RenterInsurance {
  id: string;
  user_id: string;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry_date: string | null;
  insurance_verified: boolean;
  insurance_verified_by: string | null;
  insurance_verified_at: string | null;
  insurance_document_url: string | null;
  // Computed
  days_until_expiry?: number;
  expiry_status?: 'valid' | 'expiring_soon' | 'expired' | 'not_set';
  // Joined
  renter_name?: string;
  business_name?: string;
}

export interface UpdateInsuranceData {
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_expiry_date?: string;
  insurance_document_url?: string;
}

export function useRenterInsurance(boothRenterId: string | undefined) {
  return useQuery({
    queryKey: ['renter-insurance', boothRenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booth_renter_profiles' as any)
        .select(`
          id,
          user_id,
          business_name,
          insurance_provider,
          insurance_policy_number,
          insurance_expiry_date,
          insurance_verified,
          insurance_verified_by,
          insurance_verified_at,
          insurance_document_url
        `)
        .eq('id', boothRenterId!)
        .single();

      if (error) throw error;

      const insurance = data as any;
      let days_until_expiry: number | undefined;
      let expiry_status: 'valid' | 'expiring_soon' | 'expired' | 'not_set' = 'not_set';

      if (insurance.insurance_expiry_date) {
        const expiryDate = new Date(insurance.insurance_expiry_date);
        days_until_expiry = differenceInDays(expiryDate, new Date());

        if (days_until_expiry < 0) {
          expiry_status = 'expired';
        } else if (days_until_expiry <= 30) {
          expiry_status = 'expiring_soon';
        } else {
          expiry_status = 'valid';
        }
      }

      // Get renter name
      const { data: employee } = await supabase
        .from('employee_profiles')
        .select('full_name, display_name')
        .eq('user_id', insurance.user_id)
        .single();

      return {
        ...insurance,
        days_until_expiry,
        expiry_status,
        renter_name: employee ? formatDisplayName(employee.full_name || '', employee.display_name) : undefined,
      } as RenterInsurance;
    },
    enabled: !!boothRenterId,
  });
}

export function useExpiringInsurance(organizationId: string | undefined, daysThreshold: number = 30) {
  return useQuery({
    queryKey: ['expiring-insurance', organizationId, daysThreshold],
    queryFn: async () => {
      const thresholdDate = format(addDays(new Date(), daysThreshold), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('booth_renter_profiles' as any)
        .select(`
          id,
          user_id,
          business_name,
          insurance_provider,
          insurance_policy_number,
          insurance_expiry_date,
          insurance_verified
        `)
        .eq('organization_id', organizationId!)
        .not('insurance_expiry_date', 'is', null)
        .lte('insurance_expiry_date', thresholdDate)
        .order('insurance_expiry_date', { ascending: true });

      if (error) throw error;

      // Get employee names
      const userIds = (data || []).map((r: any) => r.user_id);
      const { data: employees } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', userIds);

      const empMap = new Map((employees || []).map(e => [e.user_id, e]));

      return (data || []).map((renter: any) => {
        const emp = empMap.get(renter.user_id);
        const expiryDate = new Date(renter.insurance_expiry_date);
        const days_until_expiry = differenceInDays(expiryDate, new Date());

        return {
          ...renter,
          renter_name: emp ? formatDisplayName(emp.full_name || '', emp.display_name) : undefined,
          days_until_expiry,
          expiry_status: days_until_expiry < 0 ? 'expired' : 'expiring_soon',
        };
      }) as RenterInsurance[];
    },
    enabled: !!organizationId,
  });
}

export function useUpdateRenterInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boothRenterId,
      ...updates
    }: UpdateInsuranceData & { boothRenterId: string }) => {
      const { data, error } = await supabase
        .from('booth_renter_profiles' as any)
        .update({
          ...updates,
          insurance_verified: false, // Reset verification when details change
          insurance_verified_by: null,
          insurance_verified_at: null,
        } as any)
        .eq('id', boothRenterId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renter-insurance'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-insurance'] });
      queryClient.invalidateQueries({ queryKey: ['booth-renters'] });
      toast.success('Insurance information updated');
    },
    onError: (error) => {
      toast.error('Failed to update insurance', { description: error.message });
    },
  });
}

export function useVerifyRenterInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boothRenterId: string) => {
      const { data, error } = await supabase
        .from('booth_renter_profiles' as any)
        .update({
          insurance_verified: true,
          insurance_verified_at: new Date().toISOString(),
        } as any)
        .eq('id', boothRenterId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renter-insurance'] });
      queryClient.invalidateQueries({ queryKey: ['booth-renters'] });
      toast.success('Insurance verified');
    },
    onError: (error) => {
      toast.error('Failed to verify insurance', { description: error.message });
    },
  });
}

export function useInsuranceComplianceStats(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['insurance-compliance-stats', organizationId],
    queryFn: async () => {
      const { data: renters, error } = await supabase
        .from('booth_renter_profiles' as any)
        .select('id, insurance_expiry_date, insurance_verified, status')
        .eq('organization_id', organizationId!)
        .eq('status', 'active');

      if (error) throw error;

      const today = new Date();
      const stats = {
        total: (renters || []).length,
        compliant: 0,
        expiringSoon: 0,
        expired: 0,
        noInsurance: 0,
        unverified: 0,
      };

      (renters || []).forEach((renter: any) => {
        if (!renter.insurance_expiry_date) {
          stats.noInsurance++;
        } else {
          const expiryDate = new Date(renter.insurance_expiry_date);
          const daysUntil = differenceInDays(expiryDate, today);

          if (daysUntil < 0) {
            stats.expired++;
          } else if (daysUntil <= 30) {
            stats.expiringSoon++;
          } else if (!renter.insurance_verified) {
            stats.unverified++;
          } else {
            stats.compliant++;
          }
        }
      });

      return stats;
    },
    enabled: !!organizationId,
  });
}
