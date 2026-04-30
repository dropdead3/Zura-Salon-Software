import { useCallback, useEffect, useState } from 'react';

// ── useDismissedSuggestion ──
// Per-key dismissal flag persisted in localStorage. Used so an operator who
// deliberately ignores a suggestion chip (e.g. urgency eyebrow swap) doesn't
// see it again for the same schedule window — preventing nag.
//
// Key convention: pass a stable identifier for the *thing being suggested
// against*, e.g. the `endsAt` ISO timestamp. When the upstream value changes
// (operator edits the schedule), the dismissal naturally resets because the
// key changes.

const STORAGE_PREFIX = 'zura:dismissed-suggestion:';

function readDismissed(key: string | null | undefined): boolean {
  if (!key || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === '1';
  } catch {
    return false;
  }
}

export function useDismissedSuggestion(key: string | null | undefined) {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(key));

  // Re-read whenever the key changes (e.g. operator edits endsAt).
  useEffect(() => {
    setDismissed(readDismissed(key));
  }, [key]);

  const dismiss = useCallback(() => {
    if (!key || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, '1');
    } catch {
      // localStorage unavailable (private mode quota, etc.) — fail soft.
    }
    setDismissed(true);
  }, [key]);

  const reset = useCallback(() => {
    if (!key || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // ignore
    }
    setDismissed(false);
  }, [key]);

  return { dismissed, dismiss, reset };
}
