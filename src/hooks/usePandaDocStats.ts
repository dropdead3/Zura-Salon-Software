import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PandaDocStats {
  totalDocuments: number;
  pendingDocuments: number;
  completedDocuments: number;
  appliedDocuments: number;
  lastWebhookAt: string | null;
}

export function usePandaDocStats() {
  return useQuery({
    queryKey: ['pandadoc-stats'],
    queryFn: async (): Promise<PandaDocStats> => {
      const { data, error } = await supabase
        .from('pandadoc_documents')
        .select('id, status, applied_to_billing, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching PandaDoc stats:', error);
        throw error;
      }

      const documents = data || [];
      
      return {
        totalDocuments: documents.length,
        pendingDocuments: documents.filter(d => 
          d.status && !['completed', 'voided', 'declined'].includes(d.status)
        ).length,
        completedDocuments: documents.filter(d => d.status === 'completed').length,
        appliedDocuments: documents.filter(d => d.applied_to_billing).length,
        lastWebhookAt: documents.length > 0 ? documents[0].created_at : null,
      };
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}
