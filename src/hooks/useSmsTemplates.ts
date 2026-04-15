import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SmsTemplate {
  id: string;
  template_key: string;
  name: string;
  message_body: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSmsTemplates() {
  return useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as unknown as SmsTemplate[];
    },
  });
}

export function useSmsTemplate(templateKey: string) {
  return useQuery({
    queryKey: ['sms-template', templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('template_key', templateKey)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as SmsTemplate | null;
    },
    enabled: !!templateKey,
  });
}

export function useUpdateSmsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<SmsTemplate, 'name' | 'message_body' | 'description' | 'is_active' | 'variables'>>;
    }) => {
      const { data, error } = await supabase
        .from('sms_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('SMS template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

export function useCreateSmsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      template_key: string;
      name: string;
      message_body: string;
      description?: string;
      variables?: string[];
    }) => {
      const { data, error } = await supabase
        .from('sms_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('SMS template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useDeleteSmsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('SMS template deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}
