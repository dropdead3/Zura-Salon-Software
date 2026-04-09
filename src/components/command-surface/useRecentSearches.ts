import { useState, useCallback, useMemo } from 'react';
import type { ResultType } from './commandTypes';

const STORAGE_KEY = 'zura-recent-searches';
const MAX_RECENTS = 5;

export interface RecentSearch {
  query: string;
  selectedPath?: string;
  selectedTitle?: string;
  resultType?: ResultType;
  timestamp: number;
}

/** Migrate legacy string[] to RecentSearch[] */
function migrateRecents(raw: unknown): RecentSearch[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === 'string') {
      return { query: entry, timestamp: Date.now() };
    }
    if (entry && typeof entry === 'object' && 'query' in entry) {
      return entry as RecentSearch;
    }
    return null;
  }).filter(Boolean) as RecentSearch[];
}

export function useRecentSearches() {
  const [recentEntries, setRecentEntries] = useState<RecentSearch[]>(() => {
    try {
      return migrateRecents(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return [];
    }
  });

  const addRecent = useCallback((
    queryOrObj: string | { query: string; selectedPath?: string; selectedTitle?: string; resultType?: ResultType },
  ) => {
    const entry: RecentSearch = typeof queryOrObj === 'string'
      ? { query: queryOrObj.trim(), timestamp: Date.now() }
      : { ...queryOrObj, query: queryOrObj.query.trim(), timestamp: Date.now() };

    if (!entry.query) return;

    setRecentEntries(prev => {
      const next = [entry, ...prev.filter(e => e.query !== entry.query)].slice(0, MAX_RECENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentEntries([]);
  }, []);

  /** Backward-compat: raw query strings for consumers that only need strings */
  const recents = useMemo(() => recentEntries.map(e => e.query), [recentEntries]);

  return { recents, recentEntries, addRecent, clearRecents };
}
