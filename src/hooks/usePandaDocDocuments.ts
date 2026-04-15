import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PandaDocDocument {
  id: string;
  organization_id: string;
  pandadoc_document_id: string;
  document_name: string;
  status: 'draft' | 'sent' | 'viewed' | 'completed' | 'voided' | 'declined';
  sent_at: string | null;
  completed_at: string | null;
  signed_by_name: string | null;
  signed_by_email: string | null;
  extracted_fields: Record<string, unknown>;
  applied_to_billing: boolean;
  applied_at: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export function usePandaDocDocuments(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['pandadoc-documents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('pandadoc_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PandaDocDocument[];
    },
    enabled: !!organizationId,
  });
}

export function useLinkPandaDocDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      organizationId,
      pandadocDocumentId,
      documentName,
      documentUrl,
    }: {
      organizationId: string;
      pandadocDocumentId: string;
      documentName: string;
      documentUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from('pandadoc_documents')
        .insert({
          organization_id: organizationId,
          pandadoc_document_id: pandadocDocumentId,
          document_name: documentName,
          document_url: documentUrl || `https://app.pandadoc.com/a/#/documents/${pandadocDocumentId}`,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pandadoc-documents', variables.organizationId] });
      toast.success('Document linked successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to link document: ${error.message}`);
    },
  });
}

export function useReapplyPandaDocFields() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (documentId: string) => {
      // Get the document
      const { data: doc, error: docError } = await supabase
        .from('pandadoc_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      if (!doc.extracted_fields || Object.keys(doc.extracted_fields).length === 0) {
        throw new Error('No fields to apply');
      }
      
      // Get field mapping
      const { data: mappingSettings } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'pandadoc_field_mapping')
        .not('organization_id', 'is', null)
        .maybeSingle();
      
      const fieldMapping = (mappingSettings?.value as Record<string, string>) || {
        term_start_date: 'contract_start_date',
        term_end_date: 'contract_end_date',
        monthly_rate: 'custom_price',
        promo_months: 'promo_months',
        promo_rate: 'promo_price',
        setup_fee: 'setup_fee',
        special_notes: 'notes',
      };
      
      // Build billing update
      const billingUpdate: Record<string, unknown> = {};
      const fields = doc.extracted_fields as Record<string, { value: unknown }>;
      
      for (const [pandaDocField, billingColumn] of Object.entries(fieldMapping)) {
        const fieldData = fields[pandaDocField];
        if (fieldData?.value !== undefined && fieldData.value !== null && fieldData.value !== '') {
          const value = fieldData.value;
          
          if (billingColumn === 'plan_name_lookup') {
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('id')
              .ilike('name', String(value))
              .maybeSingle();
            
            if (plan) {
              billingUpdate.plan_id = plan.id;
            }
          } else if (billingColumn === 'contract_start_date' || billingColumn === 'contract_end_date') {
            billingUpdate[billingColumn] = String(value);
          } else if (['custom_price', 'promo_price', 'setup_fee'].includes(billingColumn)) {
            billingUpdate[billingColumn] = parseFloat(String(value));
          } else if (billingColumn === 'promo_months') {
            billingUpdate[billingColumn] = parseInt(String(value), 10);
          } else {
            billingUpdate[billingColumn] = String(value);
          }
        }
      }
      
      if (Object.keys(billingUpdate).length === 0) {
        throw new Error('No matching fields to apply');
      }
      
      // Update billing
      const { error: billingError } = await supabase
        .from('organization_billing')
        .upsert({
          organization_id: doc.organization_id,
          ...billingUpdate,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id',
        });
      
      if (billingError) throw billingError;
      
      // Update document
      await supabase
        .from('pandadoc_documents')
        .update({
          applied_to_billing: true,
          applied_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      
      return { fieldsApplied: Object.keys(billingUpdate).length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pandadoc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['organization-billing'] });
      toast.success(`Applied ${result.fieldsApplied} fields to billing`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply fields: ${error.message}`);
    },
  });
}
