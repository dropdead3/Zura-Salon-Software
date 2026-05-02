## Problem

Re-entering the website editor lands the operator on whatever they last touched (last page, last expanded groups), instead of a clean default rail. This reads as "navigation took me to the last area visited" rather than "back to the original nav tree."

## Goal

On every entry to the website editor:
- Selected page resets to **Home**.
- Section-group expand/collapse resets to defaults (Above the Fold open, others collapsed).
- Side panels (Site Design, Publish, History, Discard) start closed.

In-session navigation (clicking around, expanding groups, switching pages) still behaves normally — state only resets when you re-open the editor.

## Changes

### 1. `WebsiteEditorShell.tsx` — stop persisting `selectedPageId`
- `PersistedState` currently saves `{ selectedPageId, showPreview }` to `localStorage`. Drop `selectedPageId` from both the type and the writer; keep `showPreview` (that's a layout preference, not a navigation choice).
- Initial state: `useState<string>('home')` instead of `persisted.selectedPageId ?? 'home'`.
- Mirror the existing one-time-cleanup pattern used for the legacy `editorTab` field: read the old persisted shape and strip `selectedPageId` on next write so users carrying stale state don't keep landing on the wrong page once.
- Confirm `editorTab` already defaults to `'hero'` on entry (it does — only `?editor=` deep-links override). No change needed there.
- Confirm the panel-open booleans (`siteDesignOpen`, `publishOpen`, `historyOpen`, `discardOpen`, `revertDraftOpen`, `addPageOpen`, `templatePickerOpen`, `mobileSidebarOpen`) all initialize to `false` and aren't driven by URL/localStorage. They are — no change needed, but verify during implementation.

### 2. `useEditorSidebarPrefs.ts` — make group state session-only
The hook currently persists `collapsedGroups` to `localStorage` per org, so groups stay the way you left them across sessions. Switch to in-memory state seeded from `DEFAULT_COLLAPSED_GROUPS` on every mount:
- Drop `readPrefs` / `writePrefs` and the `STORAGE_PREFIX` constant.
- `useState` initializes directly from `DEFAULT_COLLAPSED_GROUPS`.
- `toggleGroup` updates state only — no `writePrefs` call.
- The `orgId` arg becomes unused; keep the signature so callers don't churn, but document that it's reserved for future per-org defaults.

This means: clicking around in one editor session keeps groups the way you left them; closing the editor and coming back resets to defaults.

### 3. Tests
- Add a Vitest for `WebsiteEditorShell` that mounts with stale `localStorage` containing `selectedPageId: 'about'` and asserts the rail still lands on Home, and the stale key gets stripped on next write.
- Add a Vitest for `useEditorSidebarPrefs` confirming: (a) initial state matches `DEFAULT_COLLAPSED_GROUPS` regardless of any pre-existing `localStorage` value, (b) `toggleGroup` flips state, (c) remounting resets to defaults.

### 4. Memory note
Add a one-liner to `mem://index.md` Core: *Editor rail entry contract: selected page resets to Home, section groups reset to defaults, side panels closed. Only `showPreview` and `?editor=` deep-link survive entry.*

## Out of scope

- Nav tree visual hierarchy is unchanged (Zone 1 This Page → Zone 2 Site Chrome → Zone 3 Library stays).
- `?editor=hero` deep-link override stays — programmatic entry from elsewhere (e.g. "Edit this section" buttons) still works.
- `showPreview` persistence stays (it's a layout preference, not navigation).
