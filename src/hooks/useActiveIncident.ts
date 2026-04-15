import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformIncident {
  id: string;
  status: string;
  severity: string;
  title: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  is_auto_created: boolean;
  created_at: string;
  updated_at: string;
}

export function useActiveIncident() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['active-incident'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_incidents')
        .select('*')
        .in('status', ['active', 'monitoring'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PlatformIncident | null;
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('platform-incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_incidents' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-incident'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
