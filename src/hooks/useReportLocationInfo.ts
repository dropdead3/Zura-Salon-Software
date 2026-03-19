import { useMemo } from 'react';
import { useActiveLocations } from '@/hooks/useLocations';
import type { ReportLocationInfo } from '@/lib/reportPdfLayout';

/**
 * Resolves a locationId into a ReportLocationInfo object for PDF headers.
 * Returns undefined for 'all' or missing locationId.
 */
export function useReportLocationInfo(locationId?: string): ReportLocationInfo | undefined {
  const { data: locations } = useActiveLocations();

  return useMemo(() => {
    if (!locationId || locationId === 'all' || !locations) return undefined;
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return undefined;
    return {
      name: loc.name,
      address: loc.address || undefined,
      storeNumber: loc.store_number,
    };
  }, [locationId, locations]);
}
