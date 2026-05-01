/**
 * Key-order-stable JSON serializer for editor dirty-state comparisons.
 *
 * Why: editors compare `localConfig` vs the refetched `data` to drive the
 * "Unsaved changes" indicator. After a save round-trip, the two objects are
 * semantically equal but their key insertion order can differ:
 *   - `localConfig` is built by spreading DEFAULT_X then layering field patches
 *   - `data` is `{ ...DEFAULT_X, ...dbRow }` where `dbRow` contributes keys in
 *     whatever order Postgres / JSONB returned them
 *
 * `JSON.stringify` is key-order sensitive, so the naive compare reports
 * "still dirty" forever after save. This serializer sorts keys recursively so
 * structurally equal values produce identical strings.
 *
 * Use via `useDirtyState(local, server)` (preferred) rather than calling
 * `stableStringify(...) !== stableStringify(...)` ad-hoc in each editor.
 */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** Structural equality via stable JSON serialization. */
export function isStructurallyEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
