import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

export function useServiceFormRequirements() {
  return useQuery({
    queryKey: ['service-form-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_form_requirements')
        .select(`
          *,
          form_template:form_templates(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ServiceFormRequirement[];
    },
  });
}

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

export function useServicesWithFormCount() {
  return useQuery({
    queryKey: ['services-with-form-count'],
    queryFn: async () => {
      const { data: requirements, error: reqError } = await supabase
        .from('service_form_requirements')
        .select('service_id');
      
      if (reqError) throw reqError;

      // Group by service_id and count
      const counts: Record<string, number> = {};
      requirements?.forEach(req => {
        counts[req.service_id] = (counts[req.service_id] || 0) + 1;
      });
      
      return counts;
    },
  });
}

export function useLinkFormToService() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['service-form-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['services-with-form-count'] });
      queryClient.invalidateQueries({ queryKey: ['service-form-counts'] });
      queryClient.invalidateQueries({ queryKey: ['required-forms-for-services'] });
      toast.success('Form linked to service');
    },
    onError: (error) => {
      toast.error('Failed to link form: ' + error.message);
    },
  });
}

export function useLinkFormToMultipleServices() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['service-form-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['services-with-form-count'] });
      queryClient.invalidateQueries({ queryKey: ['service-form-counts'] });
      queryClient.invalidateQueries({ queryKey: ['required-forms-for-services'] });
      toast.success('Form linked to services');
    },
    onError: (error) => {
      toast.error('Failed to link form: ' + error.message);
    },
  });
}

export function useUnlinkFormFromService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_form_requirements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-form-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['services-with-form-count'] });
      queryClient.invalidateQueries({ queryKey: ['service-form-counts'] });
      queryClient.invalidateQueries({ queryKey: ['required-forms-for-services'] });
      toast.success('Form unlinked from service');
    },
    onError: (error) => {
      toast.error('Failed to unlink form: ' + error.message);
    },
  });
}

export function useUpdateFormRequirement() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['service-form-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['service-form-counts'] });
      queryClient.invalidateQueries({ queryKey: ['required-forms-for-services'] });
      toast.success('Requirement updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}
