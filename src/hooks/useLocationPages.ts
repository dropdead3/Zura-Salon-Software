/**
 * LOCATION PAGES HOOK
 *
 * Watches the locations table and auto-generates/flags pages
 * based on the active theme's blueprint location_support config.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ThemeBlueprint } from '@/types/theme-infrastructure';

interface LocationRecord {
  id: string;
  name: string;
  slug?: string;
  is_active: boolean;
}

interface LocationPageSuggestion {
  locationId: string;
  locationName: string;
  suggestedSlug: string;
  suggestedPageId: string;
  exists: boolean;
}

/**
 * Returns location page suggestions based on blueprint config.
 * Does NOT auto-create pages — returns suggestions for the editor to act on.
 */
export function useLocationPageSuggestions(
  orgId: string | undefined,
  blueprint: ThemeBlueprint | undefined,
  existingPageIds: string[]
) {
  const locationsQuery = useQuery({
    queryKey: ['locations-for-pages', orgId],
    enabled: !!orgId && !!blueprint?.location_support?.auto_generate_pages,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, is_active')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data ?? []) as LocationRecord[];
    },
  });

  const suggestions = useMemo<LocationPageSuggestion[]>(() => {
    if (!locationsQuery.data || !blueprint?.location_support?.auto_generate_pages) {
      return [];
    }

    const existingSet = new Set(existingPageIds);

    return locationsQuery.data.map(loc => {
      const slug = loc.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const pageId = `location-${loc.id}`;

      return {
        locationId: loc.id,
        locationName: loc.name,
        suggestedSlug: `locations/${slug}`,
        suggestedPageId: pageId,
        exists: existingSet.has(pageId),
      };
    });
  }, [locationsQuery.data, blueprint, existingPageIds]);

  return {
    suggestions,
    isLoading: locationsQuery.isLoading,
    missingPages: suggestions.filter(s => !s.exists),
    orphanedPageIds: existingPageIds
      .filter(id => id.startsWith('location-'))
      .filter(id => !suggestions.some(s => s.suggestedPageId === id)),
  };
}
