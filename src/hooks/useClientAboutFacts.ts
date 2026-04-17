import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AboutCategory =
  | 'pronouns'
  | 'family'
  | 'pets'
  | 'profession'
  | 'hobbies'
  | 'dietary'
  | 'sensitivities'
  | 'custom';

export interface ClientAboutFact {
  id: string;
  organization_id: string;
  client_id: string;
  category: AboutCategory;
  label: string | null;
  value: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const isDemoId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

export function useClientAboutFacts(clientId: string | null | undefined) {
  const enabled = !!clientId && !isDemoId(clientId);

  return useQuery({
    queryKey: ['client-about-facts', clientId],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ClientAboutFact[]> => {
      const { data, error } = await supabase
        .from('client_about_facts')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ClientAboutFact[];
    },
  });
}

export function useUpsertAboutFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      organization_id: string;
      client_id: string;
      category: AboutCategory;
      label?: string | null;
      value: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (input.id) {
        const { data, error } = await supabase
          .from('client_about_facts')
          .update({
            category: input.category,
            label: input.label ?? null,
            value: input.value,
          })
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('client_about_facts')
        .insert({
          organization_id: input.organization_id,
          client_id: input.client_id,
          category: input.category,
          label: input.label ?? null,
          value: input.value,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-about-facts', vars.client_id] });
    },
    onError: (error) => {
      toast.error('Failed to save: ' + (error as Error).message);
    },
  });
}

export function useDeleteAboutFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_id: _client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from('client_about_facts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-about-facts', vars.client_id] });
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + (error as Error).message);
    },
  });
}

export const ABOUT_CATEGORY_LABELS: Record<AboutCategory, string> = {
  pronouns: 'Pronouns',
  family: 'Family',
  pets: 'Pets',
  profession: 'Profession',
  hobbies: 'Hobbies',
  dietary: 'Dietary',
  sensitivities: 'Sensitivities',
  custom: 'Custom',
};

export const ABOUT_CATEGORY_ORDER: AboutCategory[] = [
  'pronouns',
  'family',
  'pets',
  'profession',
  'hobbies',
  'dietary',
  'sensitivities',
  'custom',
];
