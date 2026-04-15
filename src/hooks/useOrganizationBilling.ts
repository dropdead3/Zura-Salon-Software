import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type DiscountType = 'percentage' | 'fixed_amount' | 'promotional';
export type BillingStatus = 'draft' | 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled';

export interface OrganizationBilling {
  id: string;
  organization_id: string;
  plan_id: string | null;
  billing_cycle: BillingCycle;
  contract_length_months: number;
  contract_start_date: string | null;
  contract_end_date: string | null;
  base_price: number | null;
  custom_price: number | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_reason: string | null;
  promo_months: number | null;
  promo_price: number | null;
  promo_ends_at: string | null;
  trial_days: number;
  trial_ends_at: string | null;
  billing_starts_at: string | null;
  setup_fee: number;
  setup_fee_paid: boolean;
  per_location_fee: number;
  per_user_fee: number;
  additional_locations_purchased: number;
  additional_users_purchased: number;
  included_locations: number | null;
  included_users: number | null;
  auto_renewal: boolean;
  non_renewal_requested_at: string | null;
  non_renewal_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationBillingInsert {
  organization_id: string;
  plan_id?: string | null;
  billing_cycle?: BillingCycle;
  contract_length_months?: number;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  base_price?: number | null;
  custom_price?: number | null;
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  discount_reason?: string | null;
  promo_months?: number | null;
  promo_price?: number | null;
  promo_ends_at?: string | null;
  trial_days?: number;
  trial_ends_at?: string | null;
  billing_starts_at?: string | null;
  setup_fee?: number;
  setup_fee_paid?: boolean;
  per_location_fee?: number;
  per_user_fee?: number;
  additional_locations_purchased?: number;
  additional_users_purchased?: number;
  included_locations?: number | null;
  included_users?: number | null;
  auto_renewal?: boolean;
  notes?: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  description: string;
  price_monthly: number;
  price_annually: number;
  max_users: number;
  max_locations: number;
  features: unknown;
  is_active: boolean;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as SubscriptionPlan[];
    },
  });
}

export function useOrganizationBilling(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-billing', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('organization_billing')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as OrganizationBilling | null;
    },
    enabled: !!organizationId,
  });
}

export function useCreateOrganizationBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billing: OrganizationBillingInsert) => {
      const { data, error } = await supabase
        .from('organization_billing')
        .insert([billing])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OrganizationBilling;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization-billing', data.organization_id] });
      toast.success('Billing configuration created');
    },
    onError: (error) => {
      toast.error('Failed to create billing configuration', {
        description: error.message,
      });
    },
  });
}

export function useUpdateOrganizationBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      organizationId,
      ...updates 
    }: Partial<Omit<OrganizationBilling, 'id' | 'organization_id'>> & { 
      id: string; 
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('organization_billing')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as OrganizationBilling, organizationId };
    },
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['organization-billing', organizationId] });
      toast.success('Billing configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update billing configuration', {
        description: error.message,
      });
    },
  });
}

export function useUpsertOrganizationBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billing: OrganizationBillingInsert) => {
      const { data, error } = await supabase
        .from('organization_billing')
        .upsert([billing], { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OrganizationBilling;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization-billing', data.organization_id] });
      toast.success('Billing configuration saved');
    },
    onError: (error) => {
      toast.error('Failed to save billing configuration', {
        description: error.message,
      });
    },
  });
}

export function useUpdateOrganizationBillingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      billingStatus,
      nextInvoiceDate,
    }: { 
      organizationId: string; 
      billingStatus: BillingStatus;
      nextInvoiceDate?: string | null;
    }) => {
      const updates: Record<string, unknown> = { billing_status: billingStatus };
      if (nextInvoiceDate !== undefined) {
        updates.next_invoice_date = nextInvoiceDate;
      }

      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return { data, organizationId };
    },
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Billing status updated');
    },
    onError: (error) => {
      toast.error('Failed to update billing status', {
        description: error.message,
      });
    },
  });
}
