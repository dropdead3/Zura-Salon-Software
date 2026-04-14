import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SplashOrigin = 'default_luxury' | 'custom';

interface SplashMetadata {
  splash_origin: SplashOrigin;
}

export function useTerminalSplashOrigin(
  orgId: string | undefined,
  locationId: string | null,
  terminalLocationId: string | undefined,
) {
  return useQuery({
    queryKey: ['terminal-splash-metadata', orgId, locationId, terminalLocationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('terminal_splash_metadata')
        .select('splash_origin')
        .eq('organization_id', orgId!)
        .eq('location_id', locationId!)
        .eq('terminal_location_id', terminalLocationId!)
        .maybeSingle();
      if (error) throw error;
      return (data as SplashMetadata | null)?.splash_origin ?? null;
    },
    enabled: !!orgId && !!locationId && !!terminalLocationId,
    staleTime: 60000,
  });
}

export async function upsertSplashOrigin(
  orgId: string,
  locationId: string,
  terminalLocationId: string,
  origin: SplashOrigin,
) {
  const { error } = await supabase
    .from('terminal_splash_metadata')
    .upsert(
      {
        organization_id: orgId,
        location_id: locationId,
        terminal_location_id: terminalLocationId,
        splash_origin: origin,
      },
      { onConflict: 'organization_id,location_id,terminal_location_id' },
    );
  if (error) throw error;
}

export async function deleteSplashOrigin(
  orgId: string,
  locationId: string,
  terminalLocationId: string,
) {
  const { error } = await supabase
    .from('terminal_splash_metadata')
    .delete()
    .eq('organization_id', orgId)
    .eq('location_id', locationId)
    .eq('terminal_location_id', terminalLocationId);
  if (error) throw error;
}

/** Fetch splash origin for a given terminal without React hooks (for fire-and-forget flows). */
export async function fetchSplashOrigin(
  orgId: string,
  locationId: string,
  terminalLocationId: string,
): Promise<SplashOrigin | null> {
  const { data, error } = await supabase
    .from('terminal_splash_metadata')
    .select('splash_origin')
    .eq('organization_id', orgId)
    .eq('location_id', locationId)
    .eq('terminal_location_id', terminalLocationId)
    .maybeSingle();
  if (error) return null;
  return (data as SplashMetadata | null)?.splash_origin ?? null;
}
