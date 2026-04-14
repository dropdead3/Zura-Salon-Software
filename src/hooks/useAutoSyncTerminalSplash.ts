import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ColorTheme } from '@/hooks/useColorTheme';
import { generateDefaultSplash } from '@/lib/generate-terminal-splash';
import {
  resolveAllTerminalLocations,
  usePushSplashToAllLocations,
} from '@/hooks/useTerminalSplashScreen';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useLocations';

/**
 * Provides a `syncSplashToTheme` function that regenerates the default luxury
 * splash screen using the new palette and pushes it to all terminal locations
 * that already have an active splash screen.
 */
export function useAutoSyncTerminalSplash(
  orgLogoUrl: string | null | undefined,
  businessName: string,
) {
  const { data: locations = [] } = useLocations();
  const pushAll = usePushSplashToAllLocations();

  const syncSplashToTheme = useCallback(
    async (colorTheme: ColorTheme) => {
      // Can't generate without a logo
      if (!orgLogoUrl) return;
      if (locations.length === 0) return;

      try {
        // 1. Resolve terminal locations for every org location
        const locationIds = locations.map((l) => l.id);
        const pairs = await resolveAllTerminalLocations(locationIds);
        if (pairs.length === 0) return;

        // 2. Filter to only locations with an active splash screen
        const activePairs: typeof pairs = [];
        await Promise.all(
          pairs.map(async ({ locationId, terminalLocationId }) => {
            try {
              const { data, error } = await supabase.functions.invoke(
                'manage-stripe-terminals',
                {
                  body: {
                    action: 'get_splash_screen',
                    location_id: locationId,
                    terminal_location_id: terminalLocationId,
                  },
                },
              );
              if (!error && data?.data?.splash_screen_active) {
                activePairs.push({ locationId, terminalLocationId });
              }
            } catch {
              // skip
            }
          }),
        );

        if (activePairs.length === 0) return;

        // 3. Generate the new splash with the updated palette
        const { base64 } = await generateDefaultSplash(
          orgLogoUrl,
          businessName,
          colorTheme,
        );

        // 4. Push to all active locations (fire-and-forget toast handled by mutation)
        pushAll.mutate({
          pairs: activePairs,
          imageBase64: base64,
          imageMimeType: 'image/jpeg',
        });

        toast.success('Terminal splash screens updating to match new theme');
      } catch (err) {
        console.error('Auto-sync splash failed:', err);
        // Silent failure — theme change itself already succeeded
      }
    },
    [orgLogoUrl, businessName, locations, pushAll],
  );

  return { syncSplashToTheme };
}
