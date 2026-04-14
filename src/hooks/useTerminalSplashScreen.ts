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
