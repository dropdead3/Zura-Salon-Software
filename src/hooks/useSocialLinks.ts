import { useMemo } from 'react';
import { useBusinessSettings } from './useBusinessSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  twitter: string;
  youtube: string;
  linkedin: string;
}

const EMPTY_SOCIALS: SocialLinks = {
  instagram: '',
  facebook: '',
  tiktok: '',
  twitter: '',
  youtube: '',
  linkedin: '',
};

/**
 * Resolves social links with location override support.
 * Location-specific values override org-level defaults from business_settings.
 * When locationId is omitted, returns org-level defaults only.
 */
export function useSocialLinks(locationId?: string): SocialLinks {
  const { data: business } = useBusinessSettings();

  const { data: locationSocials } = useQuery({
    queryKey: ['location-social-links', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('social_links')
        .eq('id', locationId!)
        .single();
      if (error) return null;
      return data?.social_links as Record<string, string> | null;
    },
    enabled: !!locationId,
    staleTime: 1000 * 60 * 5,
  });

  return useMemo(() => {
    const org: SocialLinks = {
      instagram: business?.instagram_url || '',
      facebook: business?.facebook_url || '',
      tiktok: business?.tiktok_url || '',
      twitter: business?.twitter_url || '',
      youtube: business?.youtube_url || '',
      linkedin: business?.linkedin_url || '',
    };

    if (!locationSocials) return org;

    // Location overrides: non-empty values win
    return {
      instagram: locationSocials.instagram || org.instagram,
      facebook: locationSocials.facebook || org.facebook,
      tiktok: locationSocials.tiktok || org.tiktok,
      twitter: locationSocials.twitter || org.twitter,
      youtube: locationSocials.youtube || org.youtube,
      linkedin: locationSocials.linkedin || org.linkedin,
    };
  }, [business, locationSocials]);
}
