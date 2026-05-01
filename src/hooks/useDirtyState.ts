import { useMemo } from 'react';
import { useEditorDirtyState } from './useEditorDirtyState';
import { isStructurallyEqual } from '@/lib/stableStringify';

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
export function useDirtyState<T>(local: T, server: T | undefined | null): boolean {
  const isDirty = useMemo(
    () => !isStructurallyEqual(local, server),
    [local, server],
  );
  useEditorDirtyState(isDirty);
  return isDirty;
}
