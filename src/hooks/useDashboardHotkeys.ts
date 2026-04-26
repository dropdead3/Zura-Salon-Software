import { useEffect } from 'react';
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
  compactView: boolean;
  setCompactView: (v: boolean) => void;
}

/**
 * Org dashboard hotkeys (page-local):
 * - ArrowLeft / ArrowRight: toggle Detailed / Simple view
 * - ArrowUp / ArrowDown: cycle individual locations (wrap), skipping aggregate
 *
 * Mirrors the schedule page hotkey doctrine.
 */
export function useDashboardHotkeys({
  locationId,
  setLocationId,
  accessibleLocations,
  compactView,
  setCompactView,
}: UseDashboardHotkeysParams) {
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
          event.preventDefault();
          if (compactView) {
            setCompactView(false);
            toast('Switched to Detailed view', { duration: 1500 });
          }
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (!compactView) {
            setCompactView(true);
            toast('Switched to Simple view', { duration: 1500 });
          }
          return;
        case 'ArrowDown': {
          if (accessibleLocations.length <= 1) return;
          event.preventDefault();
          const onAggregate = isAllLocations(locationId);
          const idx = onAggregate
            ? -1
            : accessibleLocations.findIndex((l) => l.id === locationId);
          const next = accessibleLocations[(idx + 1) % accessibleLocations.length];
          setLocationId(next.id);
          toast(`Viewing: ${next.name}`, { duration: 1500 });
          return;
        }
        case 'ArrowUp': {
          if (accessibleLocations.length <= 1) return;
          event.preventDefault();
          const onAggregate = isAllLocations(locationId);
          const idx = onAggregate
            ? 0
            : accessibleLocations.findIndex((l) => l.id === locationId);
          const prevIdx = idx <= 0 ? accessibleLocations.length - 1 : idx - 1;
          const prev = accessibleLocations[prevIdx];
          setLocationId(prev.id);
          toast(`Viewing: ${prev.name}`, { duration: 1500 });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locationId, setLocationId, accessibleLocations, compactView, setCompactView]);
}
