/**
 * useEditorSubViewState — canonical hook for sub-view navigation state
 * inside any website-editor section editor (HeroEditor, future
 * FAQEditor sub-tabs, etc.).
 *
 * Per the **Website Editor entry contract** (Core memory): re-entering
 * the editor MUST land on the canonical default tree. Sub-editor
 * navigation state — which slide / global card / sub-tab the operator
 * was last looking at — is **in-memory only**. Persisting it to
 * localStorage strands operators deep inside a sub-panel on re-entry,
 * which reads as broken navigation.
 *
 * This hook is intentionally a one-line wrapper around `useState`. Its
 * job is naming, not behavior:
 *
 *   - The name documents the contract at the call site so the next
 *     person tempted to add localStorage persistence has to read this
 *     comment first.
 *   - A single chokepoint makes future enforcement (e.g. an ESLint
 *     rule banning `localStorage.*editor.*view` writes) trivial.
 *
 * If you find yourself wanting to persist sub-view across mounts:
 * STOP. Re-read `mem://style/hero-alignment-canon` and the entry
 * contract bullet in `mem://index.md`. The answer is almost always to
 * surface the deep link as a `?editor=<tab>` query param (which DOES
 * survive entry, by design) instead of leaking it into localStorage.
 *
 * Usage:
 *   const [view, setView] = useEditorSubViewState<HeroView>({ kind: 'hub' });
 *
 * Regression locked codebase-wide by `useEditorSubViewState.test.ts`.
 */
import { useState } from 'react';

export function useEditorSubViewState<T>(initial: T | (() => T)) {
  return useState<T>(initial);
}
