/**
 * useCheckoutUsageProjection — Read pre-computed checkout usage summaries.
 * Projection is computed synchronously on session completion.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface CheckoutUsageProjection {
  id: string;
  organization_id: string;
  appointment_id: string | null;
  appointment_service_id: string | null;
  mix_session_id: string | null;
  client_id: string | null;
  total_dispensed_weight: number;
  total_dispensed_cost: number;
  service_allowance_grams: number | null;
  overage_grams: number;
  overage_charge: number;
  requires_manager_review: boolean;
  last_calculated_at: string;
}

export function useCheckoutUsageProjection(appointmentId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['checkout-usage-projection', orgId, appointmentId],
    queryFn: async (): Promise<CheckoutUsageProjection[]> => {
      const { data, error } = await supabase
        .from('checkout_usage_projections')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('appointment_id', appointmentId!);

      if (error) throw error;
      return (data ?? []) as unknown as CheckoutUsageProjection[];
    },
    enabled: !!orgId && !!appointmentId,
    staleTime: 10_000,
  });
}

export function useCheckoutUsageBySession(sessionId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['checkout-usage-projection-session', orgId, sessionId],
    queryFn: async (): Promise<CheckoutUsageProjection | null> => {
      const { data, error } = await supabase
        .from('checkout_usage_projections')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('mix_session_id', sessionId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as CheckoutUsageProjection | null;
    },
    enabled: !!orgId && !!sessionId,
    staleTime: 10_000,
  });
}
