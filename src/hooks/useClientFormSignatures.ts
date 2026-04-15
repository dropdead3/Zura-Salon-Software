import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormTemplate } from './useFormTemplates';
import type { ServiceFormRequirement } from './useServiceFormRequirements';
import { differenceInYears } from 'date-fns';

export interface ClientFormSignature {
  id: string;
  client_id: string;
  form_template_id: string;
  form_version: string;
  signed_at: string;
  typed_signature: string | null;
  ip_address: string | null;
  appointment_id: string | null;
  collected_by: string | null;
  created_at: string;
  form_template?: FormTemplate;
}

export interface SignatureInsert {
  client_id: string;
  form_template_id: string;
  form_version: string;
  typed_signature?: string;
  ip_address?: string;
  appointment_id?: string;
  collected_by?: string;
}

export function useClientSignatures(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-form-signatures', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_form_signatures')
        .select(`
          *,
          form_template:form_templates(*)
        `)
        .eq('client_id', clientId)
        .order('signed_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ClientFormSignature[];
    },
    enabled: !!clientId,
  });
}

export function useAllSignatures(options?: { limit?: number }) {
  return useQuery({
    queryKey: ['client-form-signatures', 'all', options?.limit],
    queryFn: async () => {
      let query = supabase
        .from('client_form_signatures')
        .select(`
          *,
          form_template:form_templates(*)
        `)
        .order('signed_at', { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ClientFormSignature[];
    },
  });
}

// Check which forms still need to be signed for a client given their service requirements
export function useUnsignedFormsForClient(
  clientId: string | undefined,
  requirements: ServiceFormRequirement[] | undefined
) {
  return useQuery({
    queryKey: ['unsigned-forms', clientId, requirements?.map(r => r.id)],
    queryFn: async () => {
      if (!clientId || !requirements?.length) return [];
      
      // Get all signatures for this client
      const { data: signatures, error } = await supabase
        .from('client_form_signatures')
        .select('form_template_id, form_version, signed_at')
        .eq('client_id', clientId);
      
      if (error) throw error;

      const signatureMap = new Map<string, { version: string; signedAt: Date }>();
      signatures?.forEach(sig => {
        signatureMap.set(sig.form_template_id, {
          version: sig.form_version,
          signedAt: new Date(sig.signed_at),
        });
      });

      // Filter requirements to find unsigned forms
      const unsignedForms: ServiceFormRequirement[] = [];
      
      for (const req of requirements) {
        if (!req.is_required || !req.form_template) continue;

        const existingSig = signatureMap.get(req.form_template_id);
        
        if (!existingSig) {
          // Never signed
          unsignedForms.push(req);
          continue;
        }

        // Check based on signing frequency
        switch (req.signing_frequency) {
          case 'per_visit':
            // Always needs signing
            unsignedForms.push(req);
            break;
          case 'annually':
            // Check if signed within the last year
            const yearsSinceSigning = differenceInYears(new Date(), existingSig.signedAt);
            if (yearsSinceSigning >= 1) {
              unsignedForms.push(req);
            }
            break;
          case 'once':
          default:
            // Already signed, skip (unless version changed)
            if (existingSig.version !== req.form_template.version) {
              // New version available, could optionally require re-signing
              // For now, we respect "once" and don't require re-signing
            }
            break;
        }
      }
      
      return unsignedForms;
    },
    enabled: !!clientId && !!requirements?.length,
  });
}

export function useRecordSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signature: SignatureInsert) => {
      const { data, error } = await supabase
        .from('client_form_signatures')
        .insert(signature)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as ClientFormSignature;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-form-signatures', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['unsigned-forms', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-form-signatures', 'all'] });
      toast.success('Signature recorded');
    },
    onError: (error) => {
      toast.error('Failed to record signature: ' + error.message);
    },
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_form_signatures')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-form-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['unsigned-forms'] });
      toast.success('Signature deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete signature: ' + error.message);
    },
  });
}
