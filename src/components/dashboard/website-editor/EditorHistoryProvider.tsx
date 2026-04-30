/**
 * EditorHistoryProvider — undo/redo ledger for the Website Editor.
 *
 * Doctrine:
 *   - Producers (config writes, reorder, design overrides, inline edits) fire
 *     a `editor-history-push` CustomEvent with `{ undo, redo, label }` AFTER
 *     a successful persist. The provider does not intercept mutations; it only
 *     records inverse operations. This keeps React Query, dirty-state, and
 *     optimistic updates from fighting the history layer.
 *   - Stack semantics: pushing a new entry truncates the redo branch
 *     (standard linear history). Cap at MAX_DEPTH to bound memory.
 *   - While an undo/redo is in-flight, we suppress incoming pushes so the
 *     inverse op doesn't append itself onto the stack.
 *   - Keyboard: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z (or Cmd/Ctrl+Y) = redo.
 *     Suppressed when the active element is a contentEditable surface or an
 *     <input>/<textarea>, so native field undo continues to work for
 *     inline-edits in flight.
 *
 * Public API:
 *   - <EditorHistoryProvider> — wrap once near the editor shell.
 *   - useEditorHistory() — { canUndo, canRedo, undo, redo, lastLabel }
 *   - pushEditorHistoryEntry({ undo, redo, label }) — call after a write.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const MAX_DEPTH = 50;

export interface HistoryEntry {
  label: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

interface EditorHistoryContextValue {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  lastLabel: string | null;
  nextLabel: string | null;
}

const EditorHistoryContext = createContext<EditorHistoryContextValue | null>(null);

const PUSH_EVENT = 'editor-history-push';

/**
 * Producers call this after a successful persist to register an undo entry.
 * Safe to call from anywhere — uses a CustomEvent so producers don't need
 * the React context.
 */
export function pushEditorHistoryEntry(entry: HistoryEntry) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PUSH_EVENT, { detail: entry }));
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function EditorHistoryProvider({ children }: { children: ReactNode }) {
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const suppressPushRef = useRef(false);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // ── Push handler ──
  useEffect(() => {
    const onPush = (e: Event) => {
      if (suppressPushRef.current) return;
      const detail = (e as CustomEvent<HistoryEntry>).detail;
      if (!detail || typeof detail.undo !== 'function' || typeof detail.redo !== 'function') {
        return;
      }
      undoStackRef.current.push(detail);
      if (undoStackRef.current.length > MAX_DEPTH) {
        undoStackRef.current.shift();
      }
      // Any new edit invalidates the redo branch.
      redoStackRef.current = [];
      bump();
    };
    window.addEventListener(PUSH_EVENT, onPush);
    return () => window.removeEventListener(PUSH_EVENT, onPush);
  }, [bump]);

  const undo = useCallback(async () => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    suppressPushRef.current = true;
    try {
      await entry.undo();
      redoStackRef.current.push(entry);
      bump();
    } catch (err) {
      // If the inverse fails, put the entry back so the user can retry.
      undoStackRef.current.push(entry);
      // eslint-disable-next-line no-console
      console.warn('[editor-history] undo failed', err);
    } finally {
      // Defer flag release to the next tick so any post-mutation push events
      // dispatched synchronously during the undo are still suppressed.
      setTimeout(() => {
        suppressPushRef.current = false;
      }, 0);
    }
  }, [bump]);

  const redo = useCallback(async () => {
    const entry = redoStackRef.current.pop();
    if (!entry) return;
    suppressPushRef.current = true;
    try {
      await entry.redo();
      undoStackRef.current.push(entry);
      bump();
    } catch (err) {
      redoStackRef.current.push(entry);
      // eslint-disable-next-line no-console
      console.warn('[editor-history] redo failed', err);
    } finally {
      setTimeout(() => {
        suppressPushRef.current = false;
      }, 0);
    }
  }, [bump]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      // Don't hijack editing keystrokes inside contentEditable / inputs.
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        void redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const value = useMemo<EditorHistoryContextValue>(
    () => ({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
      undo: () => void undo(),
      redo: () => void redo(),
      lastLabel: undoStackRef.current[undoStackRef.current.length - 1]?.label ?? null,
      nextLabel: redoStackRef.current[redoStackRef.current.length - 1]?.label ?? null,
    }),
    // tick forces re-derivation when stacks mutate
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, undo, redo],
  );

  return (
    <EditorHistoryContext.Provider value={value}>{children}</EditorHistoryContext.Provider>
  );
}

export function useEditorHistory(): EditorHistoryContextValue {
  const ctx = useContext(EditorHistoryContext);
  if (!ctx) {
    // Soft fallback so producers outside the provider don't crash dev.
    return {
      canUndo: false,
      canRedo: false,
      undo: () => {},
      redo: () => {},
      lastLabel: null,
      nextLabel: null,
    };
  }
  return ctx;
}
