import { useEffect } from 'react';

/**
 * Registers a discard callback that the Website Editor shell can trigger via
 * a custom event (`editor-discard-request`). Mirrors `useEditorSaveAction`.
 *
 * The active editor implements `onDiscard` by resetting its local working
 * copy back to the server-fetched `data` (last saved state). The shell owns
 * the user-facing confirmation dialog, so the callback runs unconditionally.
 *
 * Editors that adopt `useSectionEditor` get this wiring for free.
 */
export function useEditorDiscardAction(onDiscard: () => void) {
  useEffect(() => {
    const handler = () => {
      onDiscard();
    };
    window.addEventListener('editor-discard-request', handler);
    return () => window.removeEventListener('editor-discard-request', handler);
  }, [onDiscard]);
}
