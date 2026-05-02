## Problem

When you open the Website editor (`?tab=editor`), the left rail jumps you straight into whichever editor you last touched (e.g. Hero Background, FAQ, a custom section). That's because the editor persists `editorTab` to `localStorage` per-org and restores it on every mount. So leaving and coming back never feels "fresh" — it always lands deep inside the last surface you happened to be editing.

You want normal navigation: open the editor, see the rail, pick what to work on. No automatic jump.

## Fix

Change the editor's landing behavior so re-entering the editor lands on a neutral starting point, while still letting the URL deep-link into a specific editor when something explicitly requests it.

### What changes

In `src/components/dashboard/website-editor/WebsiteEditorShell.tsx`:

1. **Stop persisting `editorTab`.** Remove it from the `PersistedState` shape and from the `writePersisted` payload. `selectedPageId` and `showPreview` stay persisted — those are layout preferences, not navigation history.

2. **Land on a neutral default on every entry.** Initialize `editorTab` to `'hero'` for the home page (and `'page-settings'` for non-home pages, matching the existing fallback at lines 343–351). No localStorage read for the active editor.

3. **Honor an explicit URL deep-link override.** If the URL carries `?editor=<tab>` (new param, opt-in), use that as the initial tab. This preserves the ability for "Edit this section" buttons elsewhere to jump straight into a specific editor without resurrecting the auto-jump behavior.

4. **One-time cleanup of stale persisted state.** On mount, strip `editorTab` from the existing `zura.websiteEditor.<orgId>` localStorage entry so users carrying the old persisted value don't keep jumping once.

### Files touched

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — drop `editorTab` from persistence, change initial value, optional `?editor=` deep-link, one-time cleanup.

### Out of scope

- The "Discard changes" / unsaved-changes guard logic stays as-is.
- `selectedPageId` persistence stays — remembering which page you were editing across reloads is genuinely useful and is not what's being complained about.
- No changes to the sidebar component itself; the rail will simply render in its normal "nothing-selected-yet" state on entry.

### Verification

1. Open the editor, click into Hero Background, navigate away to another dashboard page, come back via the sidebar/nav — should land on the default Hero editor (or Page Settings on non-home pages), not Hero Background.
2. `selectedPageId` still restores (open About page, leave, come back — still on About page).
3. `showPreview` toggle still restores.
4. Existing "open this section" deep-links from elsewhere keep working if any pass `?editor=...`.
