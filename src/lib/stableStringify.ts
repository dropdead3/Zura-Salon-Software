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
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined';
  if (Array.isArray(v)) {
    // Match JSON.stringify: undefined inside arrays serializes to null.
    return `[${v.map((item) => (item === undefined ? 'null' : stableStringify(item))).join(',')}]`;
  }
  const obj = v as Record<string, unknown>;
  // Match JSON.stringify semantics: drop keys whose values are undefined.
  // Without this, a local object `{ a: undefined }` and a server-roundtripped
  // `{}` (Postgres / JSON.stringify both strip undefined) compare as unequal,
  // sticking the editor's "Unsaved changes" pill on forever after save.
  // Trap fixed May 2026: HeroEditor's `migrateLegacyToFirstSlide` seeds
  // `text_colors: undefined` on slides, which the DB drops on write.
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** Structural equality via stable JSON serialization. */
export function isStructurallyEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
