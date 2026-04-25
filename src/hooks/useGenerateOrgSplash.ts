import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateDefaultSplash } from '@/lib/generate-terminal-splash';
import { useColorTheme, type ColorTheme } from '@/hooks/useColorTheme';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

const BUCKET = 'org-splash-cache';

/**
 * Stable fingerprint of the inputs that produce the cached splash. If any of
 * these change, the cached file is stale and should be regenerated.
 */
async function computeSplashFingerprint(
  logoUrl: string,
  themeKey: ColorTheme,
  orgName: string,
): Promise<string> {
  const input = `${logoUrl}|${themeKey}|${orgName}`;
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface GeneratedSplash {
  path: string;
  dataUrl: string;
  size: number;
  fingerprint: string;
}

/**
 * Generates a 1080×1920 JPEG splash from the org's logo + brand theme and
 * uploads it to the public `org-splash-cache` bucket as `{orgId}.jpg`.
 *
 * The `org-splash` edge function checks this bucket first and falls back to
 * the inline SVG if the file is missing — so this is a one-time owner action
 * to upgrade non-Safari PWA installs (Chrome/Edge/Firefox on Android) to a
 * real raster splash.
 *
 * Returns the generated dataUrl so the caller can render an inline preview
 * without a round-trip to storage. Stores a fingerprint of the inputs so
 * `useOrgSplashDrift` can detect when the cached file is stale.
 */
export function useGenerateOrgSplash() {
  const { effectiveOrganization } = useOrganizationContext();
  const { colorTheme } = useColorTheme();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<GeneratedSplash> => {
      const org = effectiveOrganization;
      if (!org?.id) throw new Error('No organization context');
      if (!org.logo_url) {
        throw new Error('Upload an organization logo first — the splash uses it as the centerpiece.');
      }

      const { dataUrl } = await generateDefaultSplash(
        org.logo_url,
        org.name || 'Salon',
        colorTheme,
      );

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const path = `${org.id}.jpg`;
      const fingerprint = await computeSplashFingerprint(org.logo_url, colorTheme, org.name || 'Salon');

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600',
          metadata: {
            fingerprint,
            generated_at: new Date().toISOString(),
          },
        });

      if (error) throw error;
      return { path, dataUrl, size: blob.size, fingerprint };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['org-splash-drift'] });
      toast.success('PWA splash generated', {
        description: 'New installs on Android/Chrome will show your branded splash.',
      });
    },
    onError: (err: Error) => {
      toast.error('Could not generate splash', { description: err.message });
    },
  });
}

interface SplashDriftState {
  /** Public URL of the cached splash (if it exists), with cache-bust */
  cachedUrl: string | null;
  /** Fingerprint stored on the cached file's metadata */
  cachedFingerprint: string | null;
  /** Fingerprint of the *current* inputs (logo + theme + name) */
  currentFingerprint: string | null;
  /** True iff a cached file exists AND its fingerprint differs from current inputs */
  isDrifted: boolean;
  /** True iff no cached file exists yet */
  isMissing: boolean;
}

/**
 * Detects whether the cached splash is stale relative to the org's current
 * logo / theme / name. Used to nudge the owner to regenerate.
 *
 * We deliberately *don't* auto-regenerate — the canvas renderer is browser-only
 * and a silent ~200KB upload on every Brand-settings visit is too aggressive.
 * The card surfaces a one-tap "Regenerate now" button when drift is detected.
 */
export function useOrgSplashDrift(): SplashDriftState & { isLoading: boolean } {
  const { effectiveOrganization } = useOrganizationContext();
  const { colorTheme } = useColorTheme();

  const orgId = effectiveOrganization?.id;
  const logoUrl = effectiveOrganization?.logo_url ?? null;
  const orgName = effectiveOrganization?.name ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['org-splash-drift', orgId, logoUrl, colorTheme, orgName],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<SplashDriftState> => {
      if (!orgId) {
        return {
          cachedUrl: null,
          cachedFingerprint: null,
          currentFingerprint: null,
          isDrifted: false,
          isMissing: true,
        };
      }

      const filename = `${orgId}.jpg`;

      // List the bucket root, looking for our exact file. We can't read
      // metadata directly without the list call.
      const { data: files, error } = await supabase.storage
        .from(BUCKET)
        .list('', { search: filename, limit: 1 });

      if (error) {
        return {
          cachedUrl: null,
          cachedFingerprint: null,
          currentFingerprint: null,
          isDrifted: false,
          isMissing: true,
        };
      }

      const match = files?.find((f) => f.name === filename) ?? null;
      const cachedFingerprint =
        (match?.metadata as Record<string, unknown> | undefined)?.fingerprint as string | undefined ?? null;

      const currentFingerprint = logoUrl
        ? await computeSplashFingerprint(logoUrl, colorTheme, orgName ?? 'Salon')
        : null;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      const cachedUrl = match
        ? `${pub.publicUrl}?v=${encodeURIComponent(match.updated_at ?? match.created_at ?? Date.now().toString())}`
        : null;

      return {
        cachedUrl,
        cachedFingerprint,
        currentFingerprint,
        isMissing: !match,
        isDrifted:
          !!match &&
          !!currentFingerprint &&
          !!cachedFingerprint &&
          cachedFingerprint !== currentFingerprint,
      };
    },
  });

  return {
    cachedUrl: data?.cachedUrl ?? null,
    cachedFingerprint: data?.cachedFingerprint ?? null,
    currentFingerprint: data?.currentFingerprint ?? null,
    isDrifted: data?.isDrifted ?? false,
    isMissing: data?.isMissing ?? true,
    isLoading,
  };
}
