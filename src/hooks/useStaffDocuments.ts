import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface StaffDocument {
  id: string;
  organization_id: string;
  user_id: string;
  document_type: string;
  document_name: string;
  license_number: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  status: string;
  file_url: string | null;
  notes: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useStaffDocuments() {
  const { user } = useAuth();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const documents = useQuery({
    queryKey: ['staff-documents', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*')
        .eq('organization_id', orgId!)
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      return data as unknown as StaffDocument[];
    },
    enabled: !!orgId,
  });

  const createDocument = useMutation({
    mutationFn: async (doc: Partial<StaffDocument>) => {
      const { data, error } = await supabase
        .from('staff_documents')
        .insert({
          ...doc,
          organization_id: orgId!,
          user_id: doc.user_id || user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents'] });
      toast({ title: 'Document added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add document', description: error.message, variant: 'destructive' });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff_documents')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents'] });
      toast({ title: 'Document updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update document', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents'] });
      toast({ title: 'Document deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });

  return { documents, createDocument, updateDocument, deleteDocument };
}
