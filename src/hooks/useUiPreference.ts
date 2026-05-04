/**
 * useUiPreference — per-user, per-surface JSON scratch space backed by
 * `public.user_ui_preferences`. The cross-device successor to one-off
 * `localStorage` snooze maps.
 *
 * Surface convention: kebab-case, namespaced (e.g. `reputation.gbp-grace-snooze`).
 *
 * Contract:
 *   - Reads return `null` until the row exists OR the user is signed out.
 *   - Writes upsert on (user_id, surface). Pass `null` to clear.
 *   - Optimistic: the cache is updated immediately so consumers see the
 *     change in the same render that triggered it.
 *   - Cross-device dedup gracefully degrades to last-writer-wins; we don't
 *     promise transactional resolution because these are personal nudges,
 *     not business records.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Legacy localStorage keys that should be backfilled into `user_ui_preferences`
 * the first time the corresponding surface is read after the cutover. Each
 * entry is a one-shot: once a DB row exists OR the migration has run for this
 * user+surface, we never read localStorage again.
 *
 * Add new entries here when promoting a `localStorage`-backed nudge to the
 * cross-device store, then delete the entry one release later.
 */
const LEGACY_LOCALSTORAGE_KEYS: Record<string, string> = {
  'reputation.gbp-grace-snooze': 'reputation-oauth-grace-snooze-v1',
};

const migratedSurfaces = new Set<string>();

function readLegacyValue<T>(surface: string): T | null {
  const legacyKey = LEGACY_LOCALSTORAGE_KEYS[surface];
  if (!legacyKey || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(legacyKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clearLegacyValue(surface: string) {
  const legacyKey = LEGACY_LOCALSTORAGE_KEYS[surface];
  if (!legacyKey || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(legacyKey);
  } catch {
    /* noop */
  }
}

export function useUiPreference<T>(surface: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;

  const queryKey = ['user-ui-preference', userId, surface];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<T | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_ui_preferences')
        .select('value')
        .eq('user_id', userId)
        .eq('surface', surface)
        .maybeSingle();
      if (error) {
        console.warn('useUiPreference read failed', surface, error);
        return null;
      }
      return (data?.value as T | undefined) ?? null;
    },
  });

  const setValue = useCallback(
    async (next: T | null) => {
      if (!userId) return;

      // Optimistic local cache update so the same render sees the new state.
      qc.setQueryData(queryKey, next);

      try {
        if (next === null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('user_ui_preferences')
            .delete()
            .eq('user_id', userId)
            .eq('surface', surface);
          if (error) throw error;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('user_ui_preferences')
            .upsert(
              { user_id: userId, surface, value: next as unknown as object },
              { onConflict: 'user_id,surface' },
            );
          if (error) throw error;
        }
      } catch (err) {
        console.warn('useUiPreference write failed', surface, err);
        // Roll back optimistic cache.
        qc.invalidateQueries({ queryKey });
      }
    },
    [qc, queryKey, surface, userId],
  );

  // One-shot legacy localStorage backfill. Runs once per surface per session
  // after the initial read resolves with no DB row. Idempotent: even if the
  // hook unmounts/remounts, the in-memory `migratedSurfaces` set blocks
  // re-runs, and the localStorage key is cleared on success.
  const migrationRan = useRef(false);
  useEffect(() => {
    if (migrationRan.current) return;
    if (!userId || isLoading) return;
    if (migratedSurfaces.has(`${userId}:${surface}`)) return;
    if (data !== null && data !== undefined) {
      // DB already wins — drop the stale legacy key so we never reconsider it.
      migratedSurfaces.add(`${userId}:${surface}`);
      clearLegacyValue(surface);
      migrationRan.current = true;
      return;
    }
    const legacy = readLegacyValue<T>(surface);
    migrationRan.current = true;
    migratedSurfaces.add(`${userId}:${surface}`);
    if (legacy !== null) {
      void setValue(legacy);
      clearLegacyValue(surface);
    }
  }, [data, isLoading, setValue, surface, userId]);

  return { value: (data ?? null) as T | null, isLoading, setValue };
}
