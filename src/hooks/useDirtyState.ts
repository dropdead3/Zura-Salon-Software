import { useMemo, useRef, useEffect } from 'react';
import { useEditorDirtyState } from './useEditorDirtyState';
import { isStructurallyEqual, stableStringify } from '@/lib/stableStringify';

/**
 * Canonical dirty-state hook for editors that compare a local working copy
 * against a server-fetched value.
 *
 * Why this exists:
 *   - The naive `JSON.stringify(local) !== JSON.stringify(server)` pattern
 *     is **key-order sensitive**. After a save round-trip the two objects
 *     are semantically equal but stringify to different strings, so the
 *     "Unsaved changes" pill sticks on forever.
 *   - `isStructurallyEqual` (key-sorted recursive compare) fixes that, but
 *     scattering it across every editor invites future regressions where
 *     someone "simplifies" back to JSON.stringify.
 *
 * This hook is the single approved way to derive editor dirty state from
 * a `(local, server)` pair. It also wires into `useEditorDirtyState` so
 * the floating panel's unsaved-changes UI updates automatically.
 *
 * Usage:
 *   const { data } = useHeroConfig();
 *   const [localConfig, setLocalConfig] = useState(DEFAULT_HERO);
 *   const isDirty = useDirtyState(localConfig, data);
 *
 * Returns the boolean dirty flag for callers that also need it for
 * conditional UI (e.g. enabling/disabling Save buttons).
 */
export function useDirtyState<T>(
  local: T,
  server: T | undefined | null,
  /** Optional debug label so the dev-only diff log can name the editor. */
  debugLabel?: string,
): boolean {
  const isDirty = useMemo(
    () => !isStructurallyEqual(local, server),
    [local, server],
  );
  useEditorDirtyState(isDirty);

  // ─── Dev-only: when dirty stays true, log the field-level diff so
  // operators reporting "Save bar won't clear" can paste the diff back
  // and we can see exactly which key is diverging. Throttled to once
  // per dirty-flip to avoid spamming on every keystroke. ─────────────
  const lastLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isDirty) {
      lastLoggedRef.current = null;
      return;
    }
    if (!import.meta.env.DEV) return;
    if (server === undefined || server === null) return;
    try {
      const fingerprint = stableStringify(local) + '|' + stableStringify(server);
      if (lastLoggedRef.current === fingerprint) return;
      lastLoggedRef.current = fingerprint;
      const diff = diffShallow(local as Record<string, unknown>, server as Record<string, unknown>);
      if (diff.length === 0) return;
      // eslint-disable-next-line no-console
      console.warn(
        `[useDirtyState${debugLabel ? `:${debugLabel}` : ''}] dirty=true. Field-level diff (local vs server):`,
        diff,
      );
    } catch {
      // Diagnostic only — never throw from a logger.
    }
  }, [isDirty, local, server, debugLabel]);

  return isDirty;
}

/** Shallow per-key diff using stableStringify so key-order doesn't lie. */
function diffShallow(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): Array<{ key: string; local: unknown; server: unknown }> {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [];
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  const out: Array<{ key: string; local: unknown; server: unknown }> = [];
  for (const k of keys) {
    if (stableStringify(a[k]) !== stableStringify(b[k])) {
      out.push({ key: k, local: a[k], server: b[k] });
    }
  }
  return out;
}
