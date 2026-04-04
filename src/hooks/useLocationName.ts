import { useCallback } from 'react';
import { useActiveLocations } from '@/hooks/useLocations';

/**
 * Hook that returns a function to resolve location IDs to display names.
 * Replaces the old static `getLocationName()` from stylists.ts.
 */
export function useLocationName() {
  const { data: locations } = useActiveLocations();

  const getLocationName = useCallback((locationId: string): string => {
    if (!locations) return locationId;
    const loc = locations.find(l => l.id === locationId);
    return loc?.name || locationId;
  }, [locations]);

  return { getLocationName, locations };
}
