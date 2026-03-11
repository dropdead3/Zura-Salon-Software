import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduledRentChange {
  id: string;
  contract_id: string;
  current_rent_amount: number;
  new_rent_amount: number;
  effective_date: string;
  reason: string | null;
  notification_sent: boolean;
  notification_sent_at: string | null;
  applied: boolean;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joined
  renter_name?: string;
  renter_business_name?: string;
}

export interface CreateRentChangeData {
  contract_id: string;
  current_rent_amount: number;
  new_rent_amount: number;
  effective_date: string;
  reason?: string;
  notes?: string;
}

export function useScheduledRentChanges(filters: {
  contractId?: string;
  pending?: boolean;
} = {}) {
  return useQuery({
    queryKey: ['scheduled-rent-changes', filters],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_rent_changes' as any)
        .select('*')
        .order('effective_date', { ascending: true });

      if (filters.contractId) {
        query = query.eq('contract_id', filters.contractId);
      }

      if (filters.pending) {
        query = query.eq('applied', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch contract/renter info
      const contractIds = [...new Set((data || []).map((c: any) => c.contract_id))];
      const { data: contracts } = await supabase
        .from('booth_rental_contracts' as any)
        .select('id, booth_renter_id')
        .in('id', contractIds);

      const renterIds = [...new Set((contracts || []).map((c: any) => c.booth_renter_id))];
      const { data: renterProfiles } = await supabase
        .from('booth_renter_profiles' as any)
        .select('id, business_name, user_id')
        .in('id', renterIds);

      const userIds = (renterProfiles || []).map((p: any) => p.user_id);
      const { data: empProfiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', userIds);

      const empMap = new Map((empProfiles || []).map(e => [e.user_id, e]));
      const renterMap = new Map((renterProfiles || []).map((p: any) => {
        const emp = empMap.get(p.user_id);
        return [p.id, { business_name: p.business_name, name: emp ? formatDisplayName(emp.full_name || '', emp.display_name) : undefined }];
      }));
      const contractMap = new Map((contracts || []).map((c: any) => [c.id, c.booth_renter_id]));

      return (data || []).map((change: any) => {
        const renterId = contractMap.get(change.contract_id);
        const renter = renterId ? renterMap.get(renterId) : null;
        return {
          ...change,
          renter_name: renter?.name,
          renter_business_name: renter?.business_name,
        };
      }) as ScheduledRentChange[];
    },
  });
}

export function useCreateRentChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRentChangeData) => {
      const { data: change, error } = await supabase
        .from('scheduled_rent_changes' as any)
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return change;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-rent-changes'] });
      toast.success('Rent change scheduled');
    },
    onError: (error) => {
      toast.error('Failed to schedule rent change', { description: error.message });
    },
  });
}

export function useApplyRentChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeId: string) => {
      // Get the change details
      const { data: change, error: fetchError } = await supabase
        .from('scheduled_rent_changes' as any)
        .select('*')
        .eq('id', changeId)
        .single();

      if (fetchError) throw fetchError;

      // Update the contract with new rent amount
      const { error: updateError } = await supabase
        .from('booth_rental_contracts' as any)
        .update({ rent_amount: (change as any).new_rent_amount } as any)
        .eq('id', (change as any).contract_id);

      if (updateError) throw updateError;

      // Mark change as applied
      const { data: updated, error } = await supabase
        .from('scheduled_rent_changes' as any)
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
        } as any)
        .eq('id', changeId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-rent-changes'] });
      queryClient.invalidateQueries({ queryKey: ['booth-rental-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['booth-renters'] });
      toast.success('Rent change applied');
    },
    onError: (error) => {
      toast.error('Failed to apply rent change', { description: error.message });
    },
  });
}

export function useCancelRentChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeId: string) => {
      const { error } = await supabase
        .from('scheduled_rent_changes' as any)
        .delete()
        .eq('id', changeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-rent-changes'] });
      toast.success('Rent change cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel rent change', { description: error.message });
    },
  });
}
