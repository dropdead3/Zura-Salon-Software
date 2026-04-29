import { useEffect } from 'react';

/**
 * Dispatches a custom event whenever the editor's dirty state changes,
 * so the embedded Website Editor host can intercept tab switches with unsaved work.
 */
export function useEditorDirtyState(isDirty: boolean) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('editor-dirty-state', { detail: { dirty: isDirty } })
    );
  }, [isDirty]);

  // Clean up on unmount — editor is no longer dirty when it unmounts
  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('editor-dirty-state', { detail: { dirty: false } })
      );
    };
  }, []);
}
