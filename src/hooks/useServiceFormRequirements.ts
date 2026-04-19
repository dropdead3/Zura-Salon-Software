import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { FormTemplate } from './useFormTemplates';

export interface ServiceFormRequirement {
  id: string;
  service_id: string;
  form_template_id: string;
  is_required: boolean;
  signing_frequency: 'once' | 'per_visit' | 'annually';
  created_at: string;
  form_template?: FormTemplate;
}

export interface ServiceFormRequirementInsert {
  service_id: string;
  form_template_id: string;
  is_required?: boolean;
  signing_frequency?: 'once' | 'per_visit' | 'annually';
}

/**
 * Org-wide list of every service↔form linkage row, joined with the form template.
 * Use this for catalog-level views (e.g. Forms admin showing what each form is
 * attached to). For "what does THIS service require" use `useRequiredFormsForService`.
 */
export function useServiceFormRequirements(organizationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId ?? effectiveOrganization?.id ?? null;

  return useQuery({
    queryKey: ['service-form-requirements', orgId],
    queryFn: async () => {
      // Inner-join filter on services.organization_id enforces tenant scope at
      // the query layer (defense-in-depth alongside RLS) and prevents the silent
      // 1000-row truncation cap from masking cross-org rows.
      const { data, error } = await supabase
        .from('service_form_requirements')
        .select(`
          *,
          form_template:form_templates(*),
          services!inner(organization_id)
        `)
        .eq('services.organization_id', orgId as string)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ServiceFormRequirement[];
    },
    enabled: !!orgId,
  });
}

/**
 * Per-service required-only filter — returns only `is_required = true` rows for
 * a single service. Use this at booking confirm / kiosk check-in to drive form
 * gating. For the org-wide catalog list, use `useServiceFormRequirements`.
 */
export function useRequiredFormsForService(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service-form-requirements', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      
      const { data, error } = await supabase
        .from('service_form_requirements')
        .select(`
          *,
          form_template:form_templates(*)
        `)
        .eq('service_id', serviceId)
        .eq('is_required', true);
      
      if (error) throw error;
      return data as unknown as ServiceFormRequirement[];
    },
    enabled: !!serviceId,
  });
}

// useServicesWithFormCount removed — superseded by org-scoped useServiceFormCounts.

/**
 * Targeted invalidation: refresh the org-scoped catalog list AND any
 * per-service required-forms caches (which share the `['service-form-requirements', serviceId]`
 * key prefix). Avoids the wildcard `['service-form-requirements']` prefix sweep
 * that previously refetched every variant in the cache.
 */
function invalidateFormRequirementCaches(queryClient: ReturnType<typeof useQueryClient>, orgId: string | null | undefined) {
  if (orgId) {
    queryClient.invalidateQueries({ queryKey: ['service-form-requirements', orgId] });
  }
  // Per-service caches keyed by serviceId — predicate match to avoid org-list collision
  queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === 'service-form-requirements' &&
      typeof q.queryKey[1] === 'string' &&
      q.queryKey[1] !== orgId,
  });
  queryClient.invalidateQueries({ queryKey: ['service-form-counts'] });
  queryClient.invalidateQueries({ queryKey: ['required-forms-for-services'] });
}

export function useLinkFormToService() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (requirement: ServiceFormRequirementInsert) => {
      const { data, error } = await supabase
        .from('service_form_requirements')
        .insert(requirement)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateFormRequirementCaches(queryClient, orgId);
      toast.success('Form linked to service');
    },
    onError: (error) => {
      toast.error('Failed to link form: ' + error.message);
    },
  });
}

export function useLinkFormToMultipleServices() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ 
      formTemplateId, 
      serviceIds, 
      signingFrequency = 'once',
      isRequired = true 
    }: { 
      formTemplateId: string; 
      serviceIds: string[]; 
      signingFrequency?: 'once' | 'per_visit' | 'annually';
      isRequired?: boolean;
    }) => {
      const requirements = serviceIds.map(serviceId => ({
        service_id: serviceId,
        form_template_id: formTemplateId,
        signing_frequency: signingFrequency,
        is_required: isRequired,
      }));

      const { data, error } = await supabase
        .from('service_form_requirements')
        .upsert(requirements, { onConflict: 'service_id,form_template_id' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateFormRequirementCaches(queryClient, orgId);
      toast.success('Form linked to services');
    },
    onError: (error) => {
      toast.error('Failed to link form: ' + error.message);
    },
  });
}

export function useUnlinkFormFromService() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_form_requirements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFormRequirementCaches(queryClient, orgId);
      toast.success('Form unlinked from service');
    },
    onError: (error) => {
      toast.error('Failed to unlink form: ' + error.message);
    },
  });
}

export function useUpdateFormRequirement() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<ServiceFormRequirement, 'is_required' | 'signing_frequency'>> 
    }) => {
      const { data, error } = await supabase
        .from('service_form_requirements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateFormRequirementCaches(queryClient, orgId);
      toast.success('Requirement updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}
