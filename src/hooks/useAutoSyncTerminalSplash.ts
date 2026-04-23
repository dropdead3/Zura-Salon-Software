import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ColorTheme } from '@/hooks/useColorTheme';
import { generateDefaultSplash } from '@/lib/generate-terminal-splash';
import {
  resolveAllTerminalLocations,
  usePushSplashToAllLocations,
} from '@/hooks/useTerminalSplashScreen';
import { fetchSplashOrigin, upsertSplashOrigin } from '@/hooks/useTerminalSplashMetadata';
import { useLocations } from '@/hooks/useLocations';

/**
 * Provides a `syncSplashToTheme` function that regenerates the default luxury
 * splash screen using the new palette and pushes it to all terminal locations
 * that are currently marked as `default_luxury` in splash metadata.
 */
export function useAutoSyncTerminalSplash(
  orgLogoUrl: string | null | undefined,
  businessName: string,
  orgId: string | undefined,
) {
  const { data: locations = [] } = useLocations();
  const pushAll = usePushSplashToAllLocations();

  const syncSplashToTheme = useCallback(
    async (colorTheme: ColorTheme) => {
      if (!orgLogoUrl || !orgId) return;
      if (locations.length === 0) return;

      try {
        // 1. Resolve terminal locations for every org location
        const locationIds = locations.map((l) => l.id);
        const pairs = await resolveAllTerminalLocations(locationIds);
        if (pairs.length === 0) return;

        // 2. Filter to only locations marked as default_luxury in metadata
        const defaultPairs: typeof pairs = [];
        await Promise.all(
          pairs.map(async ({ locationId, terminalLocationId }) => {
            try {
              const origin = await fetchSplashOrigin(orgId, locationId, terminalLocationId);
              if (origin === 'default_luxury') {
                defaultPairs.push({ locationId, terminalLocationId });
              }
            } catch {
              // skip
            }
          }),
        );

        if (defaultPairs.length === 0) return;

        // 3. Generate the new splash with the updated palette
        const { base64 } = await generateDefaultSplash(
          orgLogoUrl,
          businessName,
          colorTheme,
        );

        // 4. Push to all default_luxury locations
        pushAll.mutate(
          {
            pairs: defaultPairs,
            imageBase64: base64,
            imageMimeType: 'image/jpeg',
          },
          {
            onSuccess: async () => {
              // Re-mark each pair as default_luxury so future theme changes keep syncing
              await Promise.all(
                defaultPairs.map(({ locationId, terminalLocationId }) =>
                  upsertSplashOrigin(orgId, locationId, terminalLocationId, 'default_luxury').catch(() => {}),
                ),
              );
            },
          },
        );

        toast.success(
          `Syncing splash to new theme on ${defaultPairs.length} reader${defaultPairs.length === 1 ? '' : 's'}`,
        );
      } catch (err) {
        console.error('Auto-sync splash failed:', err);
      }
    },
    [orgLogoUrl, businessName, orgId, locations, pushAll],
  );

  return { syncSplashToTheme };
}
