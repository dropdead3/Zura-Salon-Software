import { useEffect, useRef, useState } from 'react';

/**
 * Editor form-state hydration that survives a refetch race.
 *
 * Problem this solves
 * -------------------
 * Editors with a `formData` + `savedSnapshot` pair (e.g. PromotionalPopupEditor)
 * historically used a refs-based dirty check inside the `[settings]` effect to
 * decide whether to re-mirror the server payload into the live form. Because
 * refs are updated in a *separate* `useEffect` (one render after the state
 * change that triggered them), a fast operator sequence — Save → edit again
 * before the post-save query refetch lands — would arrive here with stale ref
 * values that falsely registered as "clean" and clobber the just-typed edit.
 *
 * The fix: distinguish first hydration (must populate form) from refetches
 * (must preserve in-progress edits), and always read freshness via the
 * functional setState callback so we see the *latest* committed values.
 *
 * Behavior contract
 * -----------------
 *   - First non-null `settings` arrival → both snapshot and form are populated
 *     from the server payload.
 *   - Subsequent arrivals (refetches) → snapshot is updated to match server;
 *     form is left untouched whenever it diverges from the incoming payload
 *     (operator has unsaved edits = keep them).
 *   - When the form already mirrors the incoming payload (e.g. just saved and
 *     refetch confirms), the form state is no-op'd to preserve identity and
 *     avoid spurious dirty-state churn.
 */
export interface UseHydratedFormStateResult<T> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  savedSnapshot: T;
  setSavedSnapshot: React.Dispatch<React.SetStateAction<T>>;
  isDirty: boolean;
  /** True after the first non-null `settings` payload has hydrated the form. */
  hasHydrated: boolean;
}

export function useHydratedFormState<T>(
  settings: T | null | undefined,
  defaultValue: T,
): UseHydratedFormStateResult<T> {
  const [formData, setFormData] = useState<T>(defaultValue);
  const [savedSnapshot, setSavedSnapshot] = useState<T>(defaultValue);
  const hasHydratedRef = useRef(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (settings == null) return;
    const incomingSerialized = JSON.stringify(settings);

    // First load — populate both saved snapshot AND live form so the operator
    // sees their persisted config instead of the placeholder default.
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      setHasHydrated(true);
      setSavedSnapshot(settings);
      setFormData(settings);
      return;
    }

    // Refetch path. Compare *inside* the setState callbacks so we read the
    // freshest committed values — reading from refs here would lag by one
    // render and reintroduce the original race.
    setSavedSnapshot((prev) =>
      JSON.stringify(prev) === incomingSerialized ? prev : settings,
    );
    setFormData((current) => {
      // Form already mirrors the server — no-op to preserve identity.
      if (JSON.stringify(current) === incomingSerialized) return current;
      // Operator has unsaved edits — keep them. The dirty flag below will
      // correctly compare the current form against the just-updated snapshot
      // and light up the Save button.
      return current;
    });
  }, [settings]);

  const isDirty =
    JSON.stringify(formData) !== JSON.stringify(savedSnapshot);

  return {
    formData,
    setFormData,
    savedSnapshot,
    setSavedSnapshot,
    isDirty,
    hasHydrated,
  };
}
