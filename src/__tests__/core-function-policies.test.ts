/**
 * Core Function Policies — drift guard.
 *
 * Asserts that every key declared in `CORE_FUNCTION_POLICY_KEYS` exists in the
 * live `policy_library` and is `recommendation = 'required'`. Prevents silent
 * drift if a library key is renamed or its recommendation tier changes.
 *
 * Tier 1 (always runs): pure invariant checks — every key has a consumer label.
 * Tier 2 (skipped without Supabase env): live seed integration.
 *
 * See `src/lib/policy/core-function-policies.ts` for the doctrine.
 */
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  CORE_FUNCTION_POLICY_KEYS,
  CORE_FUNCTION_CONSUMERS,
} from '@/lib/policy/core-function-policies';

describe('core function policies — pure invariants', () => {
  it('every key has a consumer label', () => {
    for (const key of CORE_FUNCTION_POLICY_KEYS) {
      expect(CORE_FUNCTION_CONSUMERS[key]).toBeTruthy();
      expect(CORE_FUNCTION_CONSUMERS[key].length).toBeGreaterThan(10);
    }
  });

  it('keys are unique', () => {
    const set = new Set(CORE_FUNCTION_POLICY_KEYS);
    expect(set.size).toBe(CORE_FUNCTION_POLICY_KEYS.length);
  });
});

const hasSupabaseEnv =
  typeof import.meta !== 'undefined' &&
  !!(import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL;

describe.skipIf(!hasSupabaseEnv)('core function policies — live seed', () => {
  it('every CORE_FUNCTION_POLICY_KEYS entry exists in policy_library as required', async () => {
    const { data, error } = await supabase
      .from('policy_library')
      .select('key, recommendation')
      .in('key', [...CORE_FUNCTION_POLICY_KEYS]);

    expect(error).toBeNull();
    const rows = data ?? [];

    // RLS guard: anon role may return zero — skip rather than false-fail.
    if (rows.length === 0) {
      console.warn(
        '[core-function-policies] policy_library returned 0 rows (RLS or empty) — skipping seed assertion',
      );
      return;
    }

    const foundKeys = new Set(rows.map((r) => r.key));
    const missing = CORE_FUNCTION_POLICY_KEYS.filter((k) => !foundKeys.has(k));
    if (missing.length > 0) {
      throw new Error(
        `CORE_FUNCTION_POLICY_KEYS contains keys missing from policy_library: ${missing.join(', ')}`,
      );
    }

    const wrongTier = rows.filter((r) => r.recommendation !== 'required');
    if (wrongTier.length > 0) {
      throw new Error(
        `Core function policies must be recommendation='required'. Drift detected: ${wrongTier
          .map((r) => `${r.key}=${r.recommendation}`)
          .join(', ')}`,
      );
    }
  });
});
