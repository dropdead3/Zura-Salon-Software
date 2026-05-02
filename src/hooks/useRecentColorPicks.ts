/**
 * useRecentColorPicks
 *
 * Session-scoped recency ring for color picks made via the canonical
 * `<ThemeAwareColorInput />`. Surfaces the last N hexes operators picked
 * across the editor session so iterating ("try this red…no, slightly
 * warmer…") doesn't require re-typing.
 *
 * Storage: `sessionStorage` (per tab, cleared on close) — recency is a
 * convenience layer, not durable preference. Persisting to the DB would
 * cross-pollinate across sessions and operators.
 *
 * Subscription: `storage` events fire across tabs in the same origin only
 * for `localStorage`, not `sessionStorage`. We use a custom in-page event
 * (`zura:recent-color-picks`) so simultaneous pickers in the same tab
 * stay in sync. Cross-tab sync isn't needed for this feature.
 */

import { useCallback, useEffect, useState } from 'react';
import { normalizeHex } from '@/lib/themeTokenSwatches';

const STORAGE_KEY = 'zura.editor.recentColorPicks';
const EVENT_NAME = 'zura:recent-color-picks';
const MAX_ENTRIES = 6;

function readStored(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeStored(next: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // eslint-disable-next-line no-restricted-syntax
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // Quota / privacy mode — silently drop. Recency is best-effort.
  }
}

export function useRecentColorPicks() {
  const [picks, setPicks] = useState<string[]>(() => readStored());

  useEffect(() => {
    const onChange = () => setPicks(readStored());
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  /**
   * Record a hex as the most-recent pick. Normalizes, dedups (case-
   * insensitive), and trims the ring to MAX_ENTRIES.
   *
   * Caller responsibility: only call this for *user-initiated picks*
   * (custom hex / eyedropper / native picker) — NOT for theme-token or
   * in-use chip clicks, since those already have their own swatch rows
   * and would just bloat Recent with duplicates.
   */
  const recordPick = useCallback((rawHex: string | undefined) => {
    const hex = normalizeHex(rawHex || '');
    if (!hex) return;
    const current = readStored();
    const filtered = current.filter((c) => c.toLowerCase() !== hex.toLowerCase());
    const next = [hex, ...filtered].slice(0, MAX_ENTRIES);
    writeStored(next);
    setPicks(next);
  }, []);

  return { picks, recordPick };
}
