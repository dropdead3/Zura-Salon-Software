import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationBilling, useSubscriptionPlans } from './useOrganizationBilling';
import { useBillingCalculations, isDateInFuture } from './useBillingCalculations';

export type UrgencyLevel = 'normal' | 'warning' | 'critical' | 'expired';

export interface TrialStatus {
  isInTrial: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  urgencyLevel: UrgencyLevel;
  isExpired: boolean;
  isLoading: boolean;
}

export function getUrgencyLevel(daysRemaining: number | null): UrgencyLevel {
  if (daysRemaining === null) return 'normal';
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 2) return 'critical';
  if (daysRemaining <= 7) return 'warning';
  return 'normal';
}

interface OrgTrialFields {
  trial_ends_at: string | null;
  subscription_status: string | null;
}

export function useTrialStatus(): TrialStatus {
  const { effectiveOrganization, isLoading: isOrgLoading } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Fetch trial-specific fields directly from database
  const { data: orgTrialData, isLoading: isTrialDataLoading } = useQuery({
    queryKey: ['organization-trial-status', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('trial_ends_at, subscription_status')
        .eq('id', orgId)
        .single();
      
      if (error) throw error;
      return data as unknown as OrgTrialFields;
    },
    enabled: !!orgId,
  });

  const { data: billing, isLoading: isBillingLoading } = useOrganizationBilling(orgId);
  const { data: plans } = useSubscriptionPlans();
  
  // Find the current plan
  const currentPlan = useMemo(() => {
    if (!billing?.plan_id || !plans) return null;
    return plans.find(p => p.id === billing.plan_id) || null;
  }, [billing?.plan_id, plans]);

  // Use billing calculations hook
  const calculations = useBillingCalculations(billing, currentPlan);

  return useMemo(() => {
    const isLoading = isOrgLoading || isBillingLoading || isTrialDataLoading;
    
    // Check trial status from organization first, then from billing
    const orgTrialEndsAt = orgTrialData?.trial_ends_at;
    const billingTrialEndsAt = billing?.trial_ends_at;
    const trialEndsAtStr = billingTrialEndsAt || orgTrialEndsAt;
    
    // Check if in trial - from calculations or from org status
    const isInTrialFromCalc = calculations.isInTrial;
    const isInTrialFromOrg = orgTrialData?.subscription_status === 'trialing';
    const isTrialDateInFuture = isDateInFuture(trialEndsAtStr ?? null);
    
    const isInTrial = isInTrialFromCalc || isInTrialFromOrg || isTrialDateInFuture;
    
    if (!isInTrial || !trialEndsAtStr) {
      return {
        isInTrial: false,
        trialEndsAt: null,
        daysRemaining: null,
        hoursRemaining: null,
        urgencyLevel: 'normal' as UrgencyLevel,
        isExpired: false,
        isLoading,
      };
    }

    const trialEndsAt = new Date(trialEndsAtStr);
    const now = new Date();
    const diffMs = trialEndsAt.getTime() - now.getTime();
    
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
    const isExpired = diffMs <= 0;
    const urgencyLevel = getUrgencyLevel(daysRemaining);

    return {
      isInTrial: !isExpired,
      trialEndsAt,
      daysRemaining: isExpired ? 0 : daysRemaining,
      hoursRemaining: isExpired ? 0 : hoursRemaining,
      urgencyLevel,
      isExpired,
      isLoading,
    };
  }, [
    orgTrialData?.trial_ends_at,
    orgTrialData?.subscription_status,
    billing?.trial_ends_at,
    calculations.isInTrial,
    isOrgLoading,
    isBillingLoading,
    isTrialDataLoading,
  ]);
}
