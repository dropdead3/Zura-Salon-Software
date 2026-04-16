
## Prompt review

Clear, scoped prompt. You named the surface ("Draft Bookings") and the desired action ("clear all at once"). Tighter framing next time: specify scope ("all drafts org-wide" vs "all drafts for this client group" vs "all drafts I created") and whether you want a confirmation step. Right now I'll infer the most defensive interpretation.

## Diagnosis

Looking at the screenshot of the Draft Bookings sheet:
- Drafts are grouped by client (e.g., "Eric Day (4 drafts)", "No Client Selected (1 draft)")
- Each group already has a per-group "Discard All" link (visible top-right of Eric Day group)
- There's no global "Clear All Drafts" action at the sheet level

The `useBatchDeleteDrafts` hook already exists in `src/hooks/useDraftBookings.ts` and accepts an array of IDs — backend work is done. This is purely a UI addition.

## Fix

Single surface: the Draft Bookings sheet component (likely `src/components/dashboard/schedule/DraftBookingsSheet.tsx` — will confirm during implementation).

### A. Add a sheet-level "Clear All" action
- Place a destructive button in the sheet header next to the close button, or just below the search bar aligned right.
- Only render when `drafts.length > 0`.
- Label: "Clear All Drafts" with a Trash icon.
- Style: ghost variant with destructive text color (matches existing "Discard All" / "Discard" styling).

### B. Confirmation gate (mandatory)
- Wrap in an `AlertDialog` — clearing all drafts is destructive and irreversible.
- Title: "Clear all drafts?"
- Description: "This will permanently delete all {N} draft bookings. This cannot be undone."
- Cancel + "Clear All" (destructive) buttons.

### C. Wire to existing batch hook
- On confirm: collect every draft ID across all groups → call `useBatchDeleteDrafts` with the full array.
- Toast on success: "Cleared {N} drafts."
- Existing query invalidation in the hook handles the refresh.

### D. Selection-aware behavior (nice-to-have, in scope)
- The screenshot shows checkboxes on each draft card — if any are selected, the button label switches to "Clear Selected ({N})" and only deletes selected IDs.
- If none selected, falls back to "Clear All Drafts" behavior.
- This makes the same button serve both bulk operations without adding a second control.

## Acceptance checks

1. Open Draft Bookings sheet with multiple drafts → "Clear All Drafts" button visible in header area.
2. Click → confirmation dialog appears with accurate count.
3. Confirm → all drafts deleted, sheet shows empty state, toast confirms count.
4. Cancel → no drafts deleted.
5. With drafts selected via checkboxes → button label changes to "Clear Selected (N)" and only deletes those.
6. Empty draft list → button hidden.

## Follow-up enhancements

- Add an "Auto-clear drafts older than X days" setting (currently hardcoded to 7 days at the DB level via `expires_at`).
- Add an "Undo" toast action with a 5-second window before the delete is finalized — useful for accidental clears.
- Track "drafts cleared" in the audit log so leadership can spot patterns of staff abandoning bookings.
