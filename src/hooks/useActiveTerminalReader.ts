import { useState, useEffect, useCallback } from 'react';
import { useTerminalReaders } from '@/hooks/useStripeTerminals';

interface ActiveReader {
  id: string;
  label: string;
  status: string;
  device_type: string;
}

const STORAGE_KEY_PREFIX = 'zura_active_reader_';

export function useActiveTerminalReader(
  organizationId: string | null | undefined,
  locationId: string | null | undefined
) {
  const { data: readers = [], isLoading } = useTerminalReaders(organizationId ?? null);

  const storageKey = locationId ? `${STORAGE_KEY_PREFIX}${locationId}` : null;

  const [selectedReaderId, setSelectedReaderId] = useState<string | null>(() => {
    if (!storageKey) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });

  // Re-read from storage when location changes
  useEffect(() => {
    if (!storageKey) {
      setSelectedReaderId(null);
      return;
    }
    try {
      setSelectedReaderId(localStorage.getItem(storageKey));
    } catch {
      setSelectedReaderId(null);
    }
  }, [storageKey]);

  // Auto-select first reader if none persisted
  useEffect(() => {
    if (!isLoading && readers.length > 0 && !selectedReaderId) {
      const locationReaders = locationId
        ? readers.filter((r) => r.location === locationId || true) // Readers are org-scoped
        : readers;
      if (locationReaders.length > 0) {
        selectReader(locationReaders[0].id);
      }
    }
  }, [readers, isLoading, selectedReaderId, locationId]);

  const selectReader = useCallback(
    (readerId: string) => {
      setSelectedReaderId(readerId);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, readerId);
        } catch {
          // localStorage unavailable
        }
      }
    },
    [storageKey]
  );

  const activeReader: ActiveReader | null =
    readers.find((r) => r.id === selectedReaderId) ?? readers[0] ?? null;

  const hasReaders = readers.length > 0;

  return {
    activeReader,
    readers,
    selectedReaderId,
    selectReader,
    hasReaders,
    isLoading,
  };
}
