import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  form_type: 'service_agreement' | 'model_release' | 'consultation' | 'custom';
  content: string;
  version: string;
  is_active: boolean;
  requires_witness: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FormTemplateInsert = Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'>;
export type FormTemplateUpdate = Partial<FormTemplateInsert>;

export function useFormTemplates() {
  return useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as unknown as FormTemplate[];
    },
  });
}

export function useActiveFormTemplates() {
  return useQuery({
    queryKey: ['form-templates', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as unknown as FormTemplate[];
    },
  });
}

export function useFormTemplatesByType(type: FormTemplate['form_type']) {
  return useQuery({
    queryKey: ['form-templates', 'type', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('form_type', type)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as unknown as FormTemplate[];
    },
  });
}

export function useCreateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: FormTemplateInsert) => {
      const { data, error } = await supabase
        .from('form_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as FormTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success('Form template created');
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });
}

export function useUpdateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FormTemplateUpdate }) => {
      const { data, error } = await supabase
        .from('form_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as FormTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success('Form template updated');
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });
}

export function useDeleteFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success('Form template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });
}
