import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateDefaultSplash } from '@/lib/generate-terminal-splash';
import { useColorTheme } from '@/hooks/useColorTheme';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

/**
 * Generates a 1080×1920 PNG splash from the org's logo + brand theme and
 * uploads it to the public `org-splash-cache` bucket as `{orgId}.png`.
 *
 * The `org-splash` edge function checks this bucket first and falls back to
 * the inline SVG if the PNG is missing — so this is a one-time owner action
 * to upgrade non-Safari PWA installs (Chrome/Edge/Firefox on Android) to a
 * real raster splash.
 */
export function useGenerateOrgSplash() {
  const { effectiveOrganization } = useOrganizationContext();
  const { colorTheme } = useColorTheme();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
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

      // Convert dataURL → Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Re-encode as PNG for broadest compatibility (the generator returns JPEG)
      // We just upload the JPEG with .jpg extension to keep it lossless-enough +
      // RLS policy accepts both.
      const path = `${org.id}.jpg`;

      const { error } = await supabase.storage
        .from('org-splash-cache')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600',
        });

      if (error) throw error;
      return { path, size: blob.size };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('PWA splash generated', {
        description: 'New installs on Android/Chrome will show your branded splash.',
      });
    },
    onError: (err: Error) => {
      toast.error('Could not generate splash', { description: err.message });
    },
  });
}
