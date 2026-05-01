import { useEffect, useCallback, useRef } from 'react';

/**
 * Registers a save callback that the Hub can trigger via a custom event.
 * Also dispatches `editor-saving-state` so the Hub can show a spinner.
 *
 * Dev guard: the Save bar in the Website Editor shell only activates when
 * a sibling hook (`useDirtyState` / `useEditorDirtyState`) dispatches
 * `editor-dirty-state`. Editors that wire `useEditorSaveAction` but forget
 * the dirty broadcast ship a *dead Save button* — toggling controls does
 * nothing visible. To catch that authoring gap during local dev, this hook
 * listens for any `editor-dirty-state` event for 1.5s after mount and logs
 * a loud warning if none arrives. Production is unaffected.
 */
export function useEditorSaveAction(handleSave: () => Promise<void>) {
  const wrappedSave = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('editor-saving-state', { detail: { saving: true } }));
    try {
      await handleSave();
    } finally {
      window.dispatchEvent(new CustomEvent('editor-saving-state', { detail: { saving: false } }));
    }
  }, [handleSave]);

  useEffect(() => {
    const handler = () => {
      wrappedSave();
    };
    window.addEventListener('editor-save-request', handler);
    return () => window.removeEventListener('editor-save-request', handler);
  }, [wrappedSave]);

  // ─── Dev-only wiring guard ─────────────────────────────────────────────
  // Track whether *any* `editor-dirty-state` event has been observed during
  // this hook's lifetime. If not, the Save bar can never activate for this
  // editor — almost certainly a missing `useDirtyState` call.
  const sawDirtyBroadcast = useRef(false);
  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    const onDirty = () => {
      sawDirtyBroadcast.current = true;
    };
    window.addEventListener('editor-dirty-state', onDirty);
    const t = window.setTimeout(() => {
      if (!sawDirtyBroadcast.current) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useEditorSaveAction] No `editor-dirty-state` event observed within 1.5s ' +
            'of mount. The Website Editor Save bar will not activate for this editor. ' +
            'Add `useDirtyState(localConfig, data)` (from `@/hooks/useDirtyState`) — ' +
            'or migrate to `useSectionEditor(configHook, scope)` — alongside this ' +
            '`useEditorSaveAction` call. See `src/hooks/useDirtyState.ts` for context.',
        );
      }
    }, 1500);
    return () => {
      window.removeEventListener('editor-dirty-state', onDirty);
      window.clearTimeout(t);
    };
  }, []);
}
