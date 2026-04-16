
## Prompt review

Excellent debugging prompt. You named both symptoms in one shot: (1) duplicates in the list, (2) Alexis not being preselected from the clicked column. You also gave the screenshot which made it instantly verifiable. Teaching note: when something "renders wrong," calling out *both* the visual bug and the expected interaction behavior — like you did — is the gold standard, because it separates "data is wrong" from "default selection is wrong."

## Diagnosis

Two distinct bugs in `QuickBookingPopover.tsx`:

### 1. Duplicates — confirmed at the database
The `v_all_staff` view returns multiple rows per stylist per location at North Mesa:
- Trinity: 2 rows
- Samantha: 2 rows
- Brooklyn: 2 rows
- Eric D.: 2 rows (matches screenshot)
- Alexis, Cienna, Julia: 1 row each

The location-scoped `stylists` query (line 602) renders rows directly with no dedup. Only the *all-locations* `uniqueAllStylists` memo (line 668) dedupes by `user_id`. The normal-mode list path (`filteredStylists`) skips dedup entirely → duplicates render.

### 2. Alexis not surfaced first
The `defaultStylistId` *is* now applied to `selectedStylist` (line 477 effect we added last round), but the auto-select effect at line 729 still runs and can clobber/overwrite, AND the visual list ordering at line 1912 sorts purely by stylist level (line 715) — Alexis isn't pinned to the top even when she's the clicked-column default. So even when she's selected, she renders mid-list and the user can't see the highlight without scrolling.

## Fix

Single file: `src/components/dashboard/schedule/QuickBookingPopover.tsx`.

### A. Dedupe location-scoped stylists
Add a `useMemo` that dedupes `stylists` by `user_id` before it feeds `filteredStylists`. Mirror the exact pattern already used in `uniqueAllStylists` (line 668).

### B. Pin clicked-column stylist to the top of the list
Update the sort inside `filteredStylists` (line 715):
- If a stylist's `user_id === defaultStylistId`, force them to position 0
- Otherwise fall back to the existing level-descending sort

This guarantees Alexis appears at the top of "Available Stylists" when launched from her column, regardless of her stylist level.

### C. Harden the auto-select guard
At the auto-select effect (line 729), add `defaultStylistId` to the early-return condition so it never overwrites the explicit clicked-column selection. Currently it only checks `!selectedStylist`, which can race with the seeding effect on first render.

### D. (Out of scope but flagged) Database hygiene
The duplicate rows in `v_all_staff` are a view-level data issue (likely a join multiplying rows from `phorest_staff_mapping` or a staff_locations join). I will not change the view in this pass — only defend against it in the consumer. Worth a follow-up to add `DISTINCT ON (user_id, location_id)` at the view level so every consumer is protected.

## Acceptance checks

1. Click an empty slot in **Alexis's** column at North Mesa → open Quick Booking → pick Eric Day → reach Available Stylists.
2. List shows **7 unique stylists** (no Trinity x2, no Samantha x2, no Eric D. x2).
3. **Alexis appears first** with the selected/highlighted ring.
4. Clicking another stylist still works and updates selection.
5. Switching to a different location reloads correctly with no duplicates.
6. Stylist-first mode (people icon) is unaffected — `uniqueAllStylists` already dedupes.

## Follow-up enhancements

- Fix `v_all_staff` at the view level so no consumer has to re-dedupe — single source of truth.
- Add a small "Selected from schedule" badge under Alexis's row when she's the `defaultStylistId`, so the user understands why she's pinned to the top.
- If Alexis is *not qualified* for the selected service, still show her at the top with a muted "Not qualified for this service" subtitle and a disabled select state — better UX than silently dropping her.
