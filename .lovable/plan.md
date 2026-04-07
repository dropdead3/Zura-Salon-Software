

# Save & Discard Guard for Commission Drilldown

## Problem
Currently, level assignment fires immediately on select change, and override save is a separate action. The user wants all changes buffered locally and only committed when "Save Changes" is clicked. The dialog should block dismissal when there are unsaved changes, offering a discard option instead.

## Changes

### File: `src/components/dashboard/settings/StylistCommissionDrilldown.tsx`

1. **Buffer level changes locally**: Replace the immediate `assignLevel.mutate` call in `handleLevelChange` with a local `pendingLevel` state. The Select updates `pendingLevel` instead of firing the mutation.

2. **Track dirty state**: Compute `isDirty` by comparing:
   - `pendingLevel` vs current `member.stylist_level`
   - Override form fields vs loaded `override` values
   - `showOverride` toggle vs initial state (was there an existing override?)

3. **Block dialog close**: Override `onOpenChange` — if `isDirty` and the user tries to close (clicking overlay, X, or pressing Escape), show an inline confirmation bar at the bottom: "You have unsaved changes" with **Discard** and **Save Changes** buttons instead of closing.

4. **Save Changes handler**: A single "Save Changes" button in the footer that:
   - If level changed → fires `assignLevel.mutate`
   - If override toggled ON with data → fires `upsertOverride.mutate`
   - If override toggled OFF (was previously on) → fires `deleteOverride.mutate`
   - On all success → closes dialog

5. **Discard handler**: Resets all local state to initial values and closes dialog.

6. **Footer redesign**: Replace the current "Review Services & Pricing" footer with a two-button footer when dirty:
   - Left: `Discard` (ghost/outline)
   - Right: `Save Changes` (primary)
   - When clean (no changes): show original "Review Services & Pricing" link

7. **Remove individual Save/Remove buttons from override section**: The per-field "Save Override" and "Remove" buttons are replaced by the unified footer save. The override section becomes purely a form area.

## Behavior Summary
- Open dialog → local snapshot of current state
- Make changes (level, override toggle, rates, reason, expiry) → all local only
- Try to close with unsaved changes → blocked, shown discard/save prompt
- Click "Save Changes" → commits all mutations, then closes
- Click "Discard" → resets to snapshot, closes

## Files Changed
| File | Change |
|---|---|
| `StylistCommissionDrilldown.tsx` | Buffer all changes locally, add dirty tracking, block close, unified save/discard footer |

1 file, no database changes.

