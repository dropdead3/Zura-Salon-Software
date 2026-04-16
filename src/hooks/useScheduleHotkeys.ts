import { useEffect } from 'react';
import { addDays, subDays } from 'date-fns';

interface ScheduleHotkeyLocation {
  id: string;
  name: string;
}

interface UseScheduleHotkeysParams {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedLocation: string;
  setSelectedLocation: (id: string) => void;
  locations: ScheduleHotkeyLocation[];
}

/**
 * Schedule page hotkeys:
 * - ArrowLeft / ArrowRight: navigate days
 * - ArrowUp / ArrowDown: cycle locations
 * - Letter keys: jump to first location starting with that letter
 */
export function useScheduleHotkeys({
  currentDate,
  setCurrentDate,
  selectedLocation,
  setSelectedLocation,
  locations,
}: UseScheduleHotkeysParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip when typing or in dialogs
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

      // Ignore modifier-key combos (let browser shortcuts work)
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          setCurrentDate(addDays(currentDate, 1));
          return;
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentDate(subDays(currentDate, 1));
          return;
        case 'ArrowDown': {
          if (locations.length === 0) return;
          event.preventDefault();
          const idx = locations.findIndex((l) => l.id === selectedLocation);
          const next = locations[(idx + 1) % locations.length];
          setSelectedLocation(next.id);
          return;
        }
        case 'ArrowUp': {
          if (locations.length === 0) return;
          event.preventDefault();
          const idx = locations.findIndex((l) => l.id === selectedLocation);
          const prevIdx = idx <= 0 ? locations.length - 1 : idx - 1;
          setSelectedLocation(locations[prevIdx].id);
          return;
        }
      }

      // Letter jump (single a-z)
      if (event.key.length === 1 && /^[a-zA-Z]$/.test(event.key)) {
        const letter = event.key.toLowerCase();
        const match = locations.find((l) => l.name.trim().toLowerCase().startsWith(letter));
        if (match && match.id !== selectedLocation) {
          event.preventDefault();
          setSelectedLocation(match.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDate, setCurrentDate, selectedLocation, setSelectedLocation, locations]);
}
