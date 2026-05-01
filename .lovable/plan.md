## Goal

Lock in the post-save edit-preservation fix with a Vitest regression test so the stale-ref race in `PromotionalPopupEditor` can't silently come back.

## Scope

Add a single test file covering the exact scenario you reported:
- Operator hydrates the editor from saved settings.
- Operator edits a field, saves, then immediately changes Appearance.
- A post-save query refetch lands with the just-saved payload.
- Assertion: the Appearance change survives, and the dirty/save state is correctly recomputed against the new snapshot.

## Files to add

- `src/components/dashboard/website-editor/__tests__/PromotionalPopupEditor.refetch-race.test.tsx`

## Test outline

1. Mock `usePromotionalPopup` and `useUpdatePromotionalPopup` so we can drive the `settings` reference manually.
2. Render the editor with an initial saved payload (`appearance: 'modal'`, custom headline).
3. Assert the form hydrated (headline + appearance match server).
4. Simulate Save — flip the mocked `settings` reference to a new object with the same content (post-save refetch).
5. Between the save and the refetch resolution, change Appearance to `corner-card` via the Select.
6. Flush effects.
7. Assert:
   - The Appearance value in the form is still `corner-card` (not reverted to `modal`).
   - The dirty pill / `useEditorDirtyState` is `true` (form diverges from snapshot).
   - The custom headline is still intact.

## Why this is enough

The fix swapped ref-based dirty detection for functional-setState comparison plus a `hasHydratedRef`. The race window is exactly: refetch arrives between an edit's `setState` and React's commit. The test reproduces that ordering by driving the mocked query result synchronously, which is the only way the bug manifests in practice.

## Out of scope

- No production code changes — the fix already shipped.
- No changes to `usePromotionalPopup` or other editors. If you want the same regression coverage on Hero / Booking / etc. editors, that's a follow-up.
