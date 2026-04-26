import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { isAllLocations } from '@/lib/locationFilter';

interface DashboardHotkeyLocation {
  id: string;
  name: string;
}

interface UseDashboardHotkeysParams {
  locationId: string;
  setLocationId: (id: string) => void;
  accessibleLocations: DashboardHotkeyLocation[];
  /** When true, prepend "All Locations" as the first cycle entry. */
  canViewAggregate: boolean;
  compactView: boolean;
  setCompactView: (v: boolean) => void;
}

const AGGREGATE_ID = 'all';

/**
 * Org dashboard hotkeys (page-local):
 * - ArrowLeft / ArrowRight: clamp-toggle Simple ↔ Detailed view
 * - ArrowUp / ArrowDown: cycle locations with wrap. When `canViewAggregate`,
 *   "All Locations" is included as the first entry in the cycle.
 *
 * Mirrors the schedule page hotkey doctrine.
 */
export function useDashboardHotkeys({
  locationId,
  setLocationId,
  accessibleLocations,
  canViewAggregate,
  compactView,
  setCompactView,
}: UseDashboardHotkeysParams) {
  // Build the canonical cycle: [All?, ...locations]
  const cycle = useMemo<DashboardHotkeyLocation[]>(() => {
    const base = accessibleLocations;
    if (canViewAggregate) {
      return [{ id: AGGREGATE_ID, name: 'All Locations' }, ...base];
    }
    return base;
  }, [accessibleLocations, canViewAggregate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          // Clamped: ← always moves toward Simple. No-op if already there.
          event.preventDefault();
          if (!compactView) {
            setCompactView(true);
            toast('Switched to Simple view', { duration: 1500 });
          }
          return;
        case 'ArrowRight':
          // Clamped: → always moves toward Detailed. No-op if already there.
          event.preventDefault();
          if (compactView) {
            setCompactView(false);
            toast('Switched to Detailed view', { duration: 1500 });
          }
          return;
        case 'ArrowDown': {
          if (cycle.length <= 1) return;
          event.preventDefault();
          // Resolve current index. Aggregate ('all'/'') maps to the synthetic AGGREGATE entry if present.
          const currentIdx = isAllLocations(locationId)
            ? cycle.findIndex((l) => l.id === AGGREGATE_ID)
            : cycle.findIndex((l) => l.id === locationId);
          const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % cycle.length;
          const next = cycle[nextIdx];
          setLocationId(next.id);
          toast(`Viewing: ${next.name}`, { duration: 1500 });
          return;
        }
        case 'ArrowUp': {
          if (cycle.length <= 1) return;
          event.preventDefault();
          const currentIdx = isAllLocations(locationId)
            ? cycle.findIndex((l) => l.id === AGGREGATE_ID)
            : cycle.findIndex((l) => l.id === locationId);
          const base = currentIdx < 0 ? 0 : currentIdx;
          const prevIdx = base <= 0 ? cycle.length - 1 : base - 1;
          const prev = cycle[prevIdx];
          setLocationId(prev.id);
          toast(`Viewing: ${prev.name}`, { duration: 1500 });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locationId, setLocationId, cycle, compactView, setCompactView]);
}
