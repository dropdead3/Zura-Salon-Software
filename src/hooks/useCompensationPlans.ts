import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CompensationPlanType =
  | 'level_based'
  | 'flat_commission'
  | 'sliding_period'
  | 'sliding_trailing'
  | 'hourly_vs_commission'
  | 'hourly_plus_commission'
  | 'team_pooled'
  | 'category_based'
  | 'booth_rental';

export type CommissionBasis = 'gross' | 'net_of_discount' | 'net_of_product_cost';
export type TipHandling = 'direct' | 'pooled' | 'withheld_for_payout';
export type AddonTreatment = 'same_as_parent' | 'separate_rate' | 'no_commission';

export interface CompensationPlan {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  plan_type: CompensationPlanType;
  is_active: boolean;
  is_default: boolean;
  config: Record<string, any>;
  commission_basis: CommissionBasis;
  tip_handling: TipHandling;
  refund_clawback: boolean;
  addon_treatment: AddonTreatment;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface UserCompensationAssignment {
  id: string;
  organization_id: string;
  user_id: string;
  plan_id: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Plan-type metadata (UI labels + descriptions) ───────────────────────────

export const PLAN_TYPE_META: Record<
  CompensationPlanType,
  { label: string; short: string; description: string }
> = {
  level_based: {
    label: 'Stylist Levels',
    short: 'Career ladder',
    description:
      'Tiered career ladder. Each level carries its own service and retail commission rates.',
  },
  flat_commission: {
    label: 'Flat Commission',
    short: 'One rate for all',
    description:
      'Everyone earns the same commission rate. Simplest model — common for small or suite-style salons.',
  },
  sliding_period: {
    label: 'Sliding Scale (Pay Period)',
    short: 'Brackets reset each period',
    description:
      'Earnings move through brackets within a single pay period. Higher sales unlock higher rates.',
  },
  sliding_trailing: {
    label: 'Sliding Scale (Trailing Avg)',
    short: 'Brackets from rolling avg',
    description:
      'Bracket is set by a 4 or 13-week trailing average — prevents weekly whipsaw.',
  },
  hourly_vs_commission: {
    label: 'Hourly vs Commission',
    short: 'Whichever is higher',
    description:
      'Guaranteed hourly wage. Commission paid only when it exceeds hours × hourly rate. Default for CA/NY compliance.',
  },
  hourly_plus_commission: {
    label: 'Hourly + Commission',
    short: 'Stacked hourly base',
    description:
      'Hourly base wage plus a lower commission stacked on top. Common for apprentice and training programs.',
  },
  team_pooled: {
    label: 'Team / Pooled',
    short: 'Shared service revenue',
    description:
      'Service revenue from a team of stylists is pooled and split by hours worked or fixed percentage.',
  },
  category_based: {
    label: 'Service Category Rate',
    short: 'Per-category rates',
    description:
      'Different commission for color, cut, extensions, treatments, etc. Common for specialty salons.',
  },
  booth_rental: {
    label: 'Booth / Chair Rental',
    short: 'Weekly rent + keep above',
    description:
      'Stylist pays a weekly rent and keeps 100% (or a high %) above that floor.',
  },
};

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useCompensationPlans(includeInactive = false) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['compensation-plans', orgId, includeInactive],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('compensation_plans' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (!includeInactive) q = q.eq('is_active', true);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CompensationPlan[];
    },
  });
}

export function useUserCompensationAssignments() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['user-compensation-assignments', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('user_compensation_assignments' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gt.${today}`)
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UserCompensationAssignment[];
    },
  });
}

/** Map of user_id → assigned plan (current effective). */
export function useUserPlanMap() {
  const plansQ = useCompensationPlans(true);
  const assignmentsQ = useUserCompensationAssignments();

  const plansById = new Map((plansQ.data || []).map((p) => [p.id, p]));
  const map = new Map<string, CompensationPlan>();
  (assignmentsQ.data || []).forEach((a) => {
    const plan = plansById.get(a.plan_id);
    if (plan) map.set(a.user_id, plan);
  });

  return {
    map,
    isLoading: plansQ.isLoading || assignmentsQ.isLoading,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateCompensationPlan() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      plan_type: CompensationPlanType;
      config?: Record<string, any>;
      commission_basis?: CommissionBasis;
      tip_handling?: TipHandling;
      refund_clawback?: boolean;
      addon_treatment?: AddonTreatment;
      description?: string;
    }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No active organization');

      const slug =
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString(36);

      const userResp = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('compensation_plans' as any)
        .insert({
          organization_id: orgId,
          name: input.name,
          slug,
          plan_type: input.plan_type,
          config: input.config ?? {},
          commission_basis: input.commission_basis ?? 'gross',
          tip_handling: input.tip_handling ?? 'direct',
          refund_clawback: input.refund_clawback ?? false,
          addon_treatment: input.addon_treatment ?? 'same_as_parent',
          description: input.description ?? null,
          created_by: userResp.data.user?.id,
          is_active: true,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CompensationPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-plans'] });
      toast({ title: 'Compensation plan created' });
    },
    onError: (err) => {
      console.error(err);
      toast({
        title: 'Could not create plan',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCompensationPlan(planId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['compensation-plans', orgId, 'one', planId],
    enabled: !!orgId && !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_plans' as any)
        .select('*')
        .eq('id', planId!)
        .eq('organization_id', orgId!)
        .single();
      if (error) throw error;
      return data as unknown as CompensationPlan;
    },
  });
}

export function useUpdateCompensationPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<{
        name: string;
        description: string | null;
        config: Record<string, any>;
        commission_basis: CommissionBasis;
        tip_handling: TipHandling;
        refund_clawback: boolean;
        addon_treatment: AddonTreatment;
        is_active: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('compensation_plans' as any)
        .update(input.patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CompensationPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-plans'] });
      toast({ title: 'Plan updated' });
    },
    onError: () => {
      toast({ title: 'Could not update plan', variant: 'destructive' });
    },
  });
}

export function useAssignUserToPlan() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { userId: string; planId: string; effectiveFrom?: string }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No active organization');
      const today = input.effectiveFrom ?? new Date().toISOString().slice(0, 10);

      // Close out any current open assignment
      await supabase
        .from('user_compensation_assignments' as any)
        .update({ effective_to: today })
        .eq('organization_id', orgId)
        .eq('user_id', input.userId)
        .is('effective_to', null);

      const { error } = await supabase.from('user_compensation_assignments' as any).insert({
        organization_id: orgId,
        user_id: input.userId,
        plan_id: input.planId,
        effective_from: today,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-compensation-assignments'] });
      toast({ title: 'Staff assigned to plan' });
    },
    onError: () => {
      toast({ title: 'Could not assign staff', variant: 'destructive' });
    },
  });
}

export function useUnassignUserFromPlan() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No active organization');
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from('user_compensation_assignments' as any)
        .update({ effective_to: today })
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .is('effective_to', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-compensation-assignments'] });
      toast({ title: 'Removed from plan' });
    },
  });
}

export function useDeactivateCompensationPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('compensation_plans' as any)
        .update({ is_active: false })
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-plans'] });
      toast({ title: 'Plan deactivated' });
    },
    onError: () => {
      toast({
        title: 'Could not deactivate plan',
        variant: 'destructive',
      });
    },
  });
}
