/**
 * WebsiteEditorShell entry contract regression.
 *
 * Per the Website Editor entry contract (Core memory), entering or
 * refreshing the editor with no `?editor=` deep-link param MUST land on
 * the canonical default tree — the sidebar overview ('pages' tab) with
 * the canvas showing the "Pick a section to edit" empty-state placeholder.
 *
 * Historical bug (May 2026): `initialEditorTab` defaulted to `'hero'`,
 * which dropped operators inside the Hero Section editor on every entry
 * and refresh. The other entry-contract canon fields (`selectedPageId`,
 * `useEditorSidebarPrefs`, sub-editor `view` state) all reset correctly,
 * but the *editorTab default* itself was never locked.
 *
 * We mirror the static-source assertion pattern from
 * `HeroEditor.entry.test.tsx` because rendering `WebsiteEditorShell`
 * requires mocking org context + supabase + react-query + react-router —
 * which makes the test brittle and slow without raising the regression
 * confidence (the bug surface is a single string literal, not behavior
 * emergent from interacting hooks).
 *
 * Invariants locked here:
 *   1. The `?editor` searchParam fallback resolves to `'pages'`, never to
 *      a section-editor tab key (`'hero'`, `'services'`, `'footer'`, …).
 *   2. The empty-state placeholder render path exists and is reachable
 *      when no BUILTIN_EDITORS entry matches the active tab — i.e. when
 *      we land on `'pages'` with no section selected, the canvas falls
 *      through to "Pick a section to edit".
 *   3. The 'pages' tab is whitelisted in the non-home page-correction
 *      effect so it isn't silently bounced to a section editor.
 *
 * If any invariant breaks, the entry contract has been re-violated —
 * revert and re-read the canon entry.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHELL_PATH = path.resolve(__dirname, 'WebsiteEditorShell.tsx');
const SOURCE = fs.readFileSync(SHELL_PATH, 'utf8');

describe('WebsiteEditorShell — entry contract (default tab is overview)', () => {
  it("initialEditorTab fallback is 'pages', not a section-editor key", () => {
    // Match the canonical line, allowing whitespace flexibility around
    // the nullish-coalesce and quote style.
    const fallbackLine = SOURCE.match(
      /searchParams\.get\(\s*['"]editor['"]\s*\)\s*\?\?\s*['"]([a-z-]+)['"]/,
    );
    expect(fallbackLine, 'initialEditorTab fallback line not found').not.toBeNull();
    expect(fallbackLine![1]).toBe('pages');
  });

  it("does not default initialEditorTab to 'hero' (the original bug)", () => {
    expect(SOURCE).not.toMatch(
      /searchParams\.get\(\s*['"]editor['"]\s*\)\s*\?\?\s*['"]hero['"]/,
    );
  });

  it("'pages' is whitelisted in the non-home page-correction effect", () => {
    // The effect at ~line 363 must treat 'pages' as a valid landing tab
    // for any page (home or otherwise), so the default doesn't get
    // bounced to a section editor by the auto-correction logic.
    expect(SOURCE).toMatch(/editorTab === ['"]pages['"]/);
  });

  it("'pages' is treated as list-mode (not editor-mode) by the rail", () => {
    // The rail toggles between LIST and EDITOR mode based on this check.
    // List mode = sidebar overview is the active surface; editor mode =
    // a section/page-settings editor is open. Entry must land in list mode.
    expect(SOURCE).toMatch(/editorTab !== ['"]pages['"]/);
  });

  it('canvas exposes a "Pick a section to edit" empty-state placeholder', () => {
    // When the resolver finds no BUILTIN_EDITORS match (e.g. active tab
    // is 'pages' with no section selected), the canvas falls through to
    // this placeholder. Locking the copy ensures the empty-state path
    // isn't silently deleted in a future refactor.
    expect(SOURCE).toMatch(/Pick a section to edit/);
  });
});
