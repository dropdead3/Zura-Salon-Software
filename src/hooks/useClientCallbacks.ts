import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isCallbackStale } from '@/lib/callback-utils';

export interface ClientCallback {
  id: string;
  organization_id: string;
  client_id: string;
  prompt: string;
  trigger_date: string | null;
  created_by: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  outcome_note: string | null;
  archived_reason: 'acknowledged' | 'stale' | 'manual' | null;
}

const isDemoId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

/**
 * Active callbacks = unacknowledged AND not stale (see callback-utils — 90d cutoff).
 */
export function useClientCallbacks(
  clientId: string | null | undefined,
  options: { includeArchived?: boolean } = {},
) {
  const enabled = !!clientId && !isDemoId(clientId);

  return useQuery({
    queryKey: ['client-callbacks', clientId, options.includeArchived ?? false],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<ClientCallback[]> => {
      let query = supabase
        .from('client_callbacks')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (!options.includeArchived) {
        query = query.is('acknowledged_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const all = (data ?? []) as ClientCallback[];

      if (options.includeArchived) return all;

      // FILTER: trigger_date < now() - 90d hidden as stale (alert-fatigue)
      return all.filter((cb) => !isCallbackStale(cb));
    },
  });
}

export function useCreateCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      client_id: string;
      prompt: string;
      trigger_date?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_callbacks')
        .insert({
          organization_id: input.organization_id,
          client_id: input.client_id,
          prompt: input.prompt,
          trigger_date: input.trigger_date ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-callbacks', vars.client_id] });
      queryClient.invalidateQueries({ queryKey: ['org-active-callbacks', vars.organization_id] });
      toast.success('Follow-up saved');
    },
    onError: (error) => {
      toast.error('Failed to save follow-up: ' + (error as Error).message);
    },
  });
}

export function useAcknowledgeCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; client_id: string; outcome_note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_callbacks')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
          outcome_note: input.outcome_note?.trim() || null,
          archived_reason: 'acknowledged',
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-callbacks', vars.client_id] });
      if (data?.organization_id) {
        queryClient.invalidateQueries({ queryKey: ['org-active-callbacks', data.organization_id] });
      }
      toast.success('Marked heard');
    },
    onError: (error) => {
      toast.error('Failed to acknowledge: ' + (error as Error).message);
    },
  });
}

export function useDeleteCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_id: _client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from('client_callbacks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-callbacks', vars.client_id] });
      queryClient.invalidateQueries({ queryKey: ['org-active-callbacks'] });
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + (error as Error).message);
    },
  });
}
