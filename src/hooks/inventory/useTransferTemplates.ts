/**
 * useTransferTemplates — CRUD for batch transfer templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransferTemplate {
  id: string;
  organization_id: string;
  name: string;
  from_location_id: string | null;
  to_location_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TransferTemplateLine {
  id: string;
  template_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  created_at: string;
}

export function useTransferTemplates(orgId: string | undefined) {
  return useQuery({
    queryKey: ['transfer-templates', orgId],
    queryFn: async (): Promise<TransferTemplate[]> => {
      const { data, error } = await supabase
        .from('transfer_templates')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TransferTemplate[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTransferTemplateLines(templateId: string | null) {
  return useQuery({
    queryKey: ['transfer-template-lines', templateId],
    queryFn: async (): Promise<TransferTemplateLine[]> => {
      const { data, error } = await supabase
        .from('transfer_template_lines')
        .select('*')
        .eq('template_id', templateId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as TransferTemplateLine[];
    },
    enabled: !!templateId,
  });
}

export function useCreateTransferTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      name: string;
      from_location_id: string;
      to_location_id: string;
      notes?: string;
      lines: { product_id: string; quantity: number; unit?: string }[];
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data: template, error } = await supabase
        .from('transfer_templates')
        .insert({
          organization_id: params.organization_id,
          name: params.name,
          from_location_id: params.from_location_id,
          to_location_id: params.to_location_id,
          notes: params.notes || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;

      if (params.lines.length > 0) {
        const rows = params.lines.map(l => ({
          template_id: (template as any).id,
          product_id: l.product_id,
          quantity: l.quantity,
          unit: l.unit || 'units',
        }));
        const { error: lErr } = await supabase
          .from('transfer_template_lines')
          .insert(rows);
        if (lErr) throw lErr;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-templates'] });
      toast.success('Template saved');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });
}

export function useDeleteTransferTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('transfer_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });
}
