import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SplashScreenStatus {
  splash_screen_active: boolean;
  configuration_id: string | null;
  file_id?: string;
  splash_url?: string | null;
}

async function invokeSplashAction(action: string, locationId: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('manage-stripe-terminals', {
    body: { action, location_id: locationId, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

export function useTerminalSplashScreen(locationId: string | null, terminalLocationId?: string) {
  return useQuery({
    queryKey: ['terminal-splash-screen', locationId, terminalLocationId],
    queryFn: async () => {
      const result = await invokeSplashAction('get_splash_screen', locationId!, {
        terminal_location_id: terminalLocationId,
      });
      return result as SplashScreenStatus;
    },
    enabled: !!locationId && !!terminalLocationId,
    staleTime: 60000,
  });
}

export function useUploadSplashScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locationId,
      terminalLocationId,
      imageBase64,
      imageMimeType,
    }: {
      locationId: string;
      terminalLocationId: string;
      imageBase64: string;
      imageMimeType: 'image/jpeg' | 'image/png' | 'image/gif';
    }) => {
      return invokeSplashAction('upload_splash_screen', locationId, {
        terminal_location_id: terminalLocationId,
        image_base64: imageBase64,
        image_mime_type: imageMimeType,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-splash-screen', vars.locationId] });
      toast.success('Splash screen uploaded — readers will update within ~10 minutes');
    },
    onError: (error) => {
      toast.error('Failed to upload splash screen', { description: (error as Error).message });
    },
  });
}

export function useRemoveSplashScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locationId,
      terminalLocationId,
    }: {
      locationId: string;
      terminalLocationId: string;
    }) => {
      return invokeSplashAction('remove_splash_screen', locationId, {
        terminal_location_id: terminalLocationId,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-splash-screen', vars.locationId] });
      toast.success('Splash screen removed');
    },
    onError: (error) => {
      toast.error('Failed to remove splash screen', { description: (error as Error).message });
    },
  });
}

interface LocationTerminalPair {
  locationId: string;
  terminalLocationId: string;
}

export async function resolveAllTerminalLocations(locationIds: string[]): Promise<LocationTerminalPair[]> {
  const results: LocationTerminalPair[] = [];
  for (const locId of locationIds) {
    try {
      const { data, error } = await supabase.functions.invoke('manage-stripe-terminals', {
        body: { action: 'list_locations', location_id: locId },
      });
      if (error || data?.error) continue;
      const terminals = data?.data?.data || [];
      if (terminals.length > 0) {
        results.push({ locationId: locId, terminalLocationId: terminals[0].id });
      }
    } catch {
      // skip locations that fail
    }
  }
  return results;
}

export function usePushSplashToAllLocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pairs,
      imageBase64,
      imageMimeType,
      onProgress,
    }: {
      pairs: LocationTerminalPair[];
      imageBase64: string;
      imageMimeType: 'image/jpeg' | 'image/png' | 'image/gif';
      onProgress?: (done: number, total: number) => void;
    }) => {
      let done = 0;
      const results = await Promise.allSettled(
        pairs.map(async ({ locationId, terminalLocationId }) => {
          const res = await invokeSplashAction('upload_splash_screen', locationId, {
            terminal_location_id: terminalLocationId,
            image_base64: imageBase64,
            image_mime_type: imageMimeType,
          });
          done++;
          onProgress?.(done, pairs.length);
          return res;
        })
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      return { succeeded, total: pairs.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-splash-screen'] });
      if (result.succeeded === result.total) {
        toast.success(`Pushed to all ${result.total} locations`);
      } else {
        toast.success(`Pushed to ${result.succeeded}/${result.total} locations`, {
          description: `${result.total - result.succeeded} location(s) failed`,
        });
      }
    },
    onError: (error) => {
      toast.error('Batch push failed', { description: (error as Error).message });
    },
  });
}
