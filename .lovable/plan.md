# Fix: Enable toggle gets reverted when "Save to preview" is clicked

## What's wrong

Two save paths write to the same `promotional_popup` draft and race each other:

1. **Auto-save toggle** (`handleEnableToggle`) — fires the moment the operator flips "Show Promotional Popup".
2. **Manual "Save to preview"** — dispatches the global `editor-save-request` event, which `useEditorSaveAction` routes to `guardedSave` → `persist()` → `updateSettings.mutateAsync(formData)`.

Both ultimately call the same mutation against `site_settings.draft_value`, but they capture `formData` via React closures that go stale across renders, and the editor's `useEffect` unconditionally overwrites in-flight `formData` whenever the query refetches.

### The exact race producing the symptom

1. Operator toggles Enable ON.
   `handleEnableToggle` does `setFormData({…, enabled: true})` (schedules render) and starts `mutateAsync`.
2. Operator immediately clicks **Save to preview** (common — they want to confirm).
3. The click dispatches `editor-save-request` *synchronously*, before React has committed the new render and before `useEditorSaveAction` re-registered its handler with a fresh `persist` closure.
4. The currently-registered handler holds a stale `persist` whose closed-over `formData` still has `enabled: false`.
5. That stale mutation lands AFTER the toggle's mutation, overwriting `draft_value.enabled` back to `false`.
6. The mutation's `onSuccess` invalidates the query → refetch returns `{enabled: false}` → `useEffect` resets `formData` and `savedSnapshot` to the reverted state. Toggle visibly flips off.

A second related defect: the `useEffect` that syncs `settings → formData/savedSnapshot` runs on every refetch and silently blows away any in-flight edits, so other field edits made during an auto-save round-trip can vanish too.

## Fix

Two surgical changes in `PromotionalPopupEditor.tsx`, plus a guard inside the sync effect.

### 1. Eliminate stale closures with a `formData` ref

Track `formData` in a ref kept in sync via a layout effect. Both `handleEnableToggle` and `persist` read from the ref, not from a captured value:

```text
formDataRef.current = formData    (kept in sync each render)

handleEnableToggle(checked):
  next = { ...formDataRef.current, enabled: checked }
  setFormData(next)
  await mutateAsync(next)

persist():
  await mutateAsync(formDataRef.current)
```

Result: whichever save path fires last writes the *current* form state, not a stale snapshot. The Enable toggle's value is preserved even if Save fires synchronously a frame later.

### 2. Serialize the two save paths

Add a single `savingRef` (boolean) so an in-flight auto-save makes the manual save wait, and vice versa. Both paths flip the ref true/false around their `mutateAsync`. If `persist()` is invoked while `savingRef.current` is true, it awaits the pending mutation (via a small promise queue) before issuing its own write. Prevents interleaved writes regardless of latency.

### 3. Don't clobber dirty `formData` in the sync effect

Change the `useEffect` that mirrors `settings → formData`:

- Always update `savedSnapshot` (so dirty detection stays correct).
- Only update `formData` when the editor is **not dirty** (`formData` deep-equals the previous `savedSnapshot`). If the operator has unsaved edits, leave `formData` alone — the refetch reflects the server, but the operator's pending edits win until they save or discard.

This stops the refetch from yanking the rug out from under the operator's other in-flight edits during any auto-save round-trip.

### 4. Trigger preview refresh after manual save too

`handleEnableToggle` already calls `triggerPreviewRefresh()`; `persist()` doesn't. Add it so manual Save behaves like the toggle (preview reloads, no manual nudge).

## Files touched

- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`
  - Add `formDataRef` + `savingRef`.
  - Rewrite `handleEnableToggle` and `persist` to read from the ref and serialize through `savingRef`.
  - Update the `settings → formData/savedSnapshot` `useEffect` to preserve dirty `formData`.
  - Call `triggerPreviewRefresh()` after a successful manual `persist()`.

No DB, schema, RLS, or edge-function changes. No new dependencies. Behavior of every other editor surface is untouched — this is local to the promotional popup editor.

## QA after merge

1. Toggle Enable ON, immediately click Save to preview → toggle stays ON, draft persists with `enabled: true`, preview reloads showing the popup.
2. Edit headline, toggle Enable ON, then click Save → both the headline edit and the toggle persist together.
3. Toggle Enable OFF then immediately Save → popup stays disabled.
4. Make an edit, do not save, wait for any background refetch (e.g., focus blur) → edits remain in the form (not clobbered by the sync effect).
5. Publish flow still works — the publish dialog reads the current `draft_value`.

## Suggested follow-ups (not in this fix)

1. Promote the ref + serialize pattern into a small `useSerializedMutation` helper so other editors with hybrid auto-save + manual-save (e.g., Announcement Bar when it gets a quick-toggle) inherit the same race protection by default.
2. Add a visibility-contract dev-only log when the sync effect would have overwritten dirty `formData` — would have caught this regression in a code review.
3. E2E test in `e2e/` covering the toggle-then-save race so a future refactor can't reintroduce it.
