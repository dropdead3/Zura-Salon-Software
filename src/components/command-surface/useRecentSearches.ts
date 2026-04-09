import { useState, useCallback, useMemo } from 'react';
import type { ResultType } from './commandTypes';

const STORAGE_KEY_BASE = 'zura-recent-searches';
const MAX_RECENTS = 5;

function storageKey(orgId?: string): string {
  return orgId ? `${STORAGE_KEY_BASE}:${orgId}` : STORAGE_KEY_BASE;
}

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

export function useRecentSearches(orgId?: string) {
  const key = storageKey(orgId);

  const [recentEntries, setRecentEntries] = useState<RecentSearch[]>(() => {
    try {
      return migrateRecents(JSON.parse(localStorage.getItem(key) || '[]'));
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
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const clearRecents = useCallback(() => {
    localStorage.removeItem(key);
    setRecentEntries([]);
  }, [key]);

  /** Backward-compat: raw query strings for consumers that only need strings */
  const recents = useMemo(() => recentEntries.map(e => e.query), [recentEntries]);

  return { recents, recentEntries, addRecent, clearRecents };
}
