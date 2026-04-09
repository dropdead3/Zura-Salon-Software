import { useState, useCallback } from 'react';

const STORAGE_KEY = 'zura-recent-searches';
const MAX_RECENTS = 5;

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const addRecent = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecents(prev => {
      const next = [trimmed, ...prev.filter(q => q !== trimmed)].slice(0, MAX_RECENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecents([]);
  }, []);

  return { recents, addRecent, clearRecents };
}
