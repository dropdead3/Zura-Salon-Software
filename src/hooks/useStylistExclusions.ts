import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────
export interface StylistServiceExclusion {
  id: string;
  organization_id: string;
  employee_id: string;
  service_id: string;
  created_at: string;
}

export interface StylistCategoryExclusion {
  id: string;
  organization_id: string;
  employee_id: string;
  category_name: string;
  created_at: string;
}

// ─── Per-service exclusions (for configurator dialog) ────────────
export function useStylistServiceExclusions(serviceId: string | null) {
  return useQuery({
    queryKey: ['stylist-service-exclusions', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_service_exclusions')
        .select('*')
        .eq('service_id', serviceId!);
      if (error) throw error;
      return data as unknown as StylistServiceExclusion[];
    },
    enabled: !!serviceId,
  });
}

export function useToggleStylistServiceExclusion() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({
      service_id,
      employee_id,
      excluded,
    }: {
      service_id: string;
      employee_id: string;
      excluded: boolean;
    }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization');

      if (excluded) {
        const { error } = await supabase
          .from('stylist_service_exclusions')
          .insert({ service_id, employee_id, organization_id: orgId });
        if (error && error.code !== '23505') throw error; // ignore duplicate
      } else {
        const { error } = await supabase
          .from('stylist_service_exclusions')
          .delete()
          .eq('service_id', service_id)
          .eq('employee_id', employee_id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['stylist-service-exclusions', vars.service_id] });
      queryClient.invalidateQueries({ queryKey: ['stylist-exclusion-summaries'] });
      toast.success(vars.excluded ? 'Marked as cannot perform' : 'Removed exclusion');
    },
    onError: (e) => toast.error('Failed to update exclusion: ' + e.message),
  });
}

// ─── Org-wide summary (for tooltip) ──────────────────────────────
export interface StylistExclusionSummary {
  categories: string[];
  services: string[];
}

/**
 * Returns a Map<userId, { categories, services }> of all exclusions in the org,
 * keyed by employee user_id (not employee id) so the schedule can look up by stylist.user_id.
 */
export function useStylistExclusionSummaries() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-exclusion-summaries', orgId],
    queryFn: async () => {
      const [serviceRes, categoryRes, employeeRes, servicesRes] = await Promise.all([
        supabase
          .from('stylist_service_exclusions')
          .select('employee_id, service_id')
          .eq('organization_id', orgId!),
        supabase
          .from('stylist_category_exclusions')
          .select('employee_id, category_name')
          .eq('organization_id', orgId!),
        supabase
          .from('employee_profiles')
          .select('id, user_id')
          .eq('organization_id', orgId!),
        supabase
          .from('services')
          .select('id, name')
          .eq('organization_id', orgId!),
      ]);

      if (serviceRes.error) throw serviceRes.error;
      if (categoryRes.error) throw categoryRes.error;
      if (employeeRes.error) throw employeeRes.error;
      if (servicesRes.error) throw servicesRes.error;

      const empIdToUserId = new Map<string, string>();
      (employeeRes.data ?? []).forEach((e: any) => empIdToUserId.set(e.id, e.user_id));

      const serviceIdToName = new Map<string, string>();
      (servicesRes.data ?? []).forEach((s: any) => serviceIdToName.set(s.id, s.name));

      const summaries = new Map<string, StylistExclusionSummary>();
      const ensure = (userId: string) => {
        if (!summaries.has(userId)) summaries.set(userId, { categories: [], services: [] });
        return summaries.get(userId)!;
      };

      (categoryRes.data ?? []).forEach((row: any) => {
        const userId = empIdToUserId.get(row.employee_id);
        if (!userId) return;
        ensure(userId).categories.push(row.category_name);
      });

      (serviceRes.data ?? []).forEach((row: any) => {
        const userId = empIdToUserId.get(row.employee_id);
        if (!userId) return;
        const name = serviceIdToName.get(row.service_id);
        if (name) ensure(userId).services.push(name);
      });

      return summaries;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
