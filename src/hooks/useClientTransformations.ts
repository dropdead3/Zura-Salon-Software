import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { optimizeImage } from '@/lib/image-utils';

export interface ClientTransformation {
  id: string;
  organization_id: string;
  client_id: string;
  appointment_id: string | null;
  before_url: string | null;
  after_url: string | null;
  service_name: string | null;
  stylist_user_id: string | null;
  notes: string | null;
  portfolio_approved: boolean;
  portfolio_category: string | null;
  taken_at: string | null;
  created_at: string;
}

export function useClientTransformations(clientId: string | null | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['client-transformations', orgId, clientId],
    queryFn: async (): Promise<ClientTransformation[]> => {
      const { data, error } = await supabase
        .from('client_transformation_photos')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('client_id', clientId!)
        .order('taken_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ClientTransformation[];
    },
    enabled: !!orgId && !!clientId,
    staleTime: 30_000,
  });
}

export function usePortfolioTransformations(stylistUserId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['portfolio-transformations', orgId, stylistUserId],
    queryFn: async (): Promise<ClientTransformation[]> => {
      let query = supabase
        .from('client_transformation_photos')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('portfolio_approved', true)
        .order('taken_at', { ascending: false, nullsFirst: false });

      if (stylistUserId) {
        query = query.eq('stylist_user_id', stylistUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ClientTransformation[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

async function uploadTransformationPhoto(
  file: File,
  orgId: string,
  clientId: string,
  type: 'before' | 'after'
): Promise<string> {
  const { blob } = await optimizeImage(file, {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.85,
    format: 'webp',
  });

  const ext = 'webp';
  const path = `${orgId}/${clientId}/${Date.now()}_${type}.${ext}`;

  const { error } = await supabase.storage
    .from('client-transformations')
    .upload(path, blob, { contentType: 'image/webp', upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('client-transformations')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

interface AddTransformationParams {
  clientId: string;
  appointmentId?: string;
  beforeFile?: File;
  afterFile?: File;
  serviceName?: string;
  notes?: string;
  takenAt?: string;
  portfolioCategory?: string;
}

export function useAddTransformation() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: AddTransformationParams) => {
      if (!orgId) throw new Error('No organization');

      let beforeUrl: string | null = null;
      let afterUrl: string | null = null;

      if (params.beforeFile) {
        beforeUrl = await uploadTransformationPhoto(params.beforeFile, orgId, params.clientId, 'before');
      }
      if (params.afterFile) {
        afterUrl = await uploadTransformationPhoto(params.afterFile, orgId, params.clientId, 'after');
      }

      const { data, error } = await supabase
        .from('client_transformation_photos')
        .insert({
          organization_id: orgId,
          client_id: params.clientId,
          appointment_id: params.appointmentId || null,
          before_url: beforeUrl,
          after_url: afterUrl,
          service_name: params.serviceName || null,
          stylist_user_id: user?.id || null,
          notes: params.notes || null,
          taken_at: params.takenAt || new Date().toISOString().split('T')[0],
          portfolio_category: params.portfolioCategory || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-transformations', orgId, vars.clientId] });
      toast.success('Transformation added');
    },
    onError: (error) => {
      toast.error('Failed to add transformation: ' + error.message);
    },
  });
}

export function useUpdateTransformation() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      clientId: string;
      updates: Partial<Pick<ClientTransformation, 'portfolio_approved' | 'portfolio_category' | 'notes' | 'service_name'>>;
    }) => {
      const { data, error } = await supabase
        .from('client_transformation_photos')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-transformations', orgId, vars.clientId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-transformations'] });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}

export function useDeleteTransformation() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_transformation_photos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-transformations', orgId, vars.clientId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-transformations'] });
      toast.success('Transformation removed');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
}
