import { useCallback, useState } from 'react';
import type { UnsavedChangesDialogProps } from '@/components/ui/unsaved-changes-dialog';

// ── useUnsavedChangesGuard ──
// Pairs with <UnsavedChangesDialog />. Hoists the navigate-away state machine
// (pending nav target + isDirty short-circuit + editor-saving-state listener
// for deferred navigation) out of every consumer so adoption is a 3-line
// change instead of a ~30-line copy-paste.
//
// Wiring contract on the editor side (already used by WebsiteEditorShell):
//   • Editor dispatches `editor-saving-state` { detail: { saving: boolean } }
//     around its async save. The hook listens for that pulse to time the
//     deferred navigation.
//   • Editor responds to `editor-save-request` by calling its save handler.
//
// Any new consumer (EmailTemplateEditor, future PolicyEditor, etc.) only has
// to follow that two-event contract — the dialog state and event listeners
// are managed here.
//
// Usage (sketch):
//
//   const guard = useUnsavedChangesGuard({
//     isDirty,
//     onNavigate: (target) => setActiveSection(target),
//   });
//
//   <Tabs onValueChange={guard.requestNav} ... />
//   <UnsavedChangesDialog {...guard.dialogProps} />

export interface UseUnsavedChangesGuardOptions<T> {
  /** Current dirty state — `requestNav` only intercepts when true. */
  isDirty: boolean;
  /** Apply the pending navigation. Called after Discard or after Save resolves. */
  onNavigate: (target: T) => void;
  /**
   * Optional hook fired before discarding edits. Use it to broadcast an
   * `editor-dirty-state` reset event (mirrors the Shell's existing pattern)
   * so downstream listeners drop their stale dirty flag in lockstep.
   */
  onBeforeDiscard?: () => void;
  /**
   * Event name the editor listens on to trigger its save handler.
   * Defaults to the canonical `editor-save-request`.
   */
  saveRequestEvent?: string;
  /**
   * Event name the editor pulses around its async save.
   * Defaults to the canonical `editor-saving-state`.
   */
  savingStateEvent?: string;
}

export interface UnsavedChangesGuard<T> {
  /** True while the dialog is open with a pending navigation target. */
  pending: T | null;
  /**
   * Call instead of navigating directly. If the form is clean, runs
   * `onNavigate` immediately. If dirty, opens the dialog and stashes the
   * target until the operator chooses Discard or Save.
   */
  requestNav: (target: T) => void;
  /** Manually clear the pending nav (e.g. external close). */
  clear: () => void;
  /** Props to spread onto `<UnsavedChangesDialog />`. */
  dialogProps: Pick<
    UnsavedChangesDialogProps,
    'open' | 'onCancel' | 'onDiscard' | 'onSave'
  >;
}

export function useUnsavedChangesGuard<T>({
  isDirty,
  onNavigate,
  onBeforeDiscard,
  saveRequestEvent = 'editor-save-request',
  savingStateEvent = 'editor-saving-state',
}: UseUnsavedChangesGuardOptions<T>): UnsavedChangesGuard<T> {
  const [pending, setPending] = useState<T | null>(null);

  const requestNav = useCallback(
    (target: T) => {
      if (!isDirty) {
        onNavigate(target);
        return;
      }
      setPending(target);
    },
    [isDirty, onNavigate],
  );

  const clear = useCallback(() => setPending(null), []);

  const onCancel = useCallback(() => setPending(null), []);

  const onDiscard = useCallback(() => {
    if (pending == null) return;
    onBeforeDiscard?.();
    onNavigate(pending);
    setPending(null);
  }, [pending, onNavigate, onBeforeDiscard]);

  const onSave = useCallback(() => {
    if (pending == null) return;
    // Listen for the editor's saving-state pulse. Once it transitions
    // saving → idle (i.e. it actually fired and finished), run the
    // deferred navigation. Generic across every editor wired to the
    // saveRequestEvent / savingStateEvent contract.
    const navTarget = pending;
    let armed = false;
    const onSavingChange = (evt: Event) => {
      const saving = !!(evt as CustomEvent).detail?.saving;
      if (saving) {
        armed = true;
        return;
      }
      if (!armed) return;
      window.removeEventListener(savingStateEvent, onSavingChange);
      onNavigate(navTarget);
      setPending(null);
    };
    window.addEventListener(savingStateEvent, onSavingChange);
    window.dispatchEvent(new CustomEvent(saveRequestEvent));
  }, [pending, onNavigate, saveRequestEvent, savingStateEvent]);

  return {
    pending,
    requestNav,
    clear,
    dialogProps: {
      open: pending !== null,
      onCancel,
      onDiscard,
      onSave,
    },
  };
}
