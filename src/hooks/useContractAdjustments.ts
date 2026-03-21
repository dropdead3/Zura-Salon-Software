import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addMonths, format, parseISO } from 'date-fns';

export type AdjustmentType = 'term_extension' | 'comp_months' | 'date_change' | 'custom';

export interface ContractAdjustment {
  id: string;
  organization_id: string;
  adjustment_type: AdjustmentType;
  description: string;
  previous_start_date: string | null;
  new_start_date: string | null;
  previous_end_date: string | null;
  new_end_date: string | null;
  months_added: number | null;
  comp_value: number | null;
  reason: string;
  approved_by: string;
  created_at: string;
}

export function useContractAdjustments(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['contract-adjustments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('contract_adjustments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContractAdjustment[];
    },
    enabled: !!organizationId,
  });
}

export function useExtendTerm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      organizationId,
      monthsToAdd,
      reason,
    }: {
      organizationId: string;
      monthsToAdd: number;
      reason: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get current billing
      const { data: billing, error: billingError } = await supabase
        .from('organization_billing')
        .select('contract_end_date, contract_start_date')
        .eq('organization_id', organizationId)
        .single();
      
      if (billingError) throw billingError;
      
      const currentEndDate = billing.contract_end_date;
      if (!currentEndDate) {
        throw new Error('No contract end date set');
      }
      
      const newEndDate = format(addMonths(parseISO(currentEndDate), monthsToAdd), 'yyyy-MM-dd');
      
      // Update billing
      const { error: updateError } = await supabase
        .from('organization_billing')
        .update({
          contract_end_date: newEndDate,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      // Log adjustment
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('contract_adjustments')
        .insert({
          organization_id: organizationId,
          adjustment_type: 'term_extension',
          description: `Extended contract by ${monthsToAdd} month${monthsToAdd > 1 ? 's' : ''}`,
          previous_end_date: currentEndDate,
          new_end_date: newEndDate,
          months_added: monthsToAdd,
          reason,
          approved_by: user.id,
        })
        .select()
        .single();
      
      if (adjustmentError) throw adjustmentError;
      
      // Log billing change
      await supabase.from('billing_changes').insert({
        organization_id: organizationId,
        change_type: 'term_extension',
        previous_value: { contract_end_date: currentEndDate },
        new_value: { contract_end_date: newEndDate },
        notes: reason,
        effective_date: new Date().toISOString(),
        created_by: user.id,
      });
      
      return adjustment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-adjustments', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-billing', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['billing-history', variables.organizationId] });
      toast.success('Contract extended successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to extend contract: ${error.message}`);
    },
  });
}

export function useCompMonths() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      organizationId,
      monthsToComp,
      monthlyRate,
      reason,
    }: {
      organizationId: string;
      monthsToComp: number;
      monthlyRate: number;
      reason: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const compValue = monthsToComp * monthlyRate;
      
      // Get current billing for end date
      const { data: billing, error: billingError } = await supabase
        .from('organization_billing')
        .select('contract_end_date')
        .eq('organization_id', organizationId)
        .single();
      
      if (billingError) throw billingError;
      
      const currentEndDate = billing.contract_end_date;
      const newEndDate = currentEndDate 
        ? format(addMonths(parseISO(currentEndDate), monthsToComp), 'yyyy-MM-dd')
        : null;
      
      // Update billing - extend term (comp months add to contract length)
      const { error: updateError } = await supabase
        .from('organization_billing')
        .update({
          contract_end_date: newEndDate || currentEndDate,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      // Log adjustment
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('contract_adjustments')
        .insert({
          organization_id: organizationId,
          adjustment_type: 'comp_months',
          description: `Comp'd ${monthsToComp} month${monthsToComp > 1 ? 's' : ''} ($${compValue.toFixed(2)} value)`,
          previous_end_date: currentEndDate,
          new_end_date: newEndDate,
          months_added: monthsToComp,
          comp_value: compValue,
          reason,
          approved_by: user.id,
        })
        .select()
        .single();
      
      if (adjustmentError) throw adjustmentError;
      
      // Log billing change
      await supabase.from('billing_changes').insert({
        organization_id: organizationId,
        change_type: 'comp_applied',
        previous_value: { contract_end_date: currentEndDate },
        new_value: { contract_end_date: newEndDate, comp_value: compValue },
        notes: `${reason} - $${compValue.toFixed(2)} value comp'd`,
        effective_date: new Date().toISOString(),
        created_by: user.id,
      });
      
      return adjustment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-adjustments', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-billing', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['billing-history', variables.organizationId] });
      toast.success('Complimentary months applied');
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply comp months: ${error.message}`);
    },
  });
}

export function useChangeDates() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      organizationId,
      newStartDate,
      newEndDate,
      reason,
    }: {
      organizationId: string;
      newStartDate?: string;
      newEndDate?: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!newStartDate && !newEndDate) throw new Error('At least one date must be provided');
      
      // Get current billing
      const { data: billing, error: billingError } = await supabase
        .from('organization_billing')
        .select('contract_start_date, contract_end_date')
        .eq('organization_id', organizationId)
        .single();
      
      if (billingError) throw billingError;
      
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (newStartDate) updates.contract_start_date = newStartDate;
      if (newEndDate) updates.contract_end_date = newEndDate;
      
      // Update billing
      const { error: updateError } = await supabase
        .from('organization_billing')
        .update(updates)
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      // Log adjustment
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('contract_adjustments')
        .insert({
          organization_id: organizationId,
          adjustment_type: 'date_change',
          description: 'Manual date adjustment',
          previous_start_date: billing.contract_start_date,
          new_start_date: newStartDate || billing.contract_start_date,
          previous_end_date: billing.contract_end_date,
          new_end_date: newEndDate || billing.contract_end_date,
          reason,
          approved_by: user.id,
        })
        .select()
        .single();
      
      if (adjustmentError) throw adjustmentError;
      
      // Log billing change
      await supabase.from('billing_changes').insert({
        organization_id: organizationId,
        change_type: 'date_change',
        previous_value: {
          contract_start_date: billing.contract_start_date,
          contract_end_date: billing.contract_end_date,
        },
        new_value: {
          contract_start_date: newStartDate || billing.contract_start_date,
          contract_end_date: newEndDate || billing.contract_end_date,
        },
        notes: reason,
        effective_date: new Date().toISOString(),
        created_by: user.id,
      });
      
      return adjustment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-adjustments', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-billing', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['billing-history', variables.organizationId] });
      toast.success('Contract dates updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update dates: ${error.message}`);
    },
  });
}
