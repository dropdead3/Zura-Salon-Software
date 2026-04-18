

## Bug: "Stylist 5" appears in Happening Now because a Phorest staff is unmapped

### Root cause (confirmed via DB inspection)

The user's hypothesis is partially right and partially wrong:
- **Wrong:** these are not the same appointment shown twice. They are two genuinely separate Phorest appointments — different staff IDs, different locations, slightly different end times (17:30 vs 17:00).
- **Right:** something IS broken. The "Stylist 5" appointment at North Mesa belongs to Phorest staff ID `LTAp-jlMGDKgre8YqAf9Fg` who has **zero rows** in `phorest_staff_mapping` (and therefore in `v_all_staff`). With no name available, `useLiveSessionSnapshot` falls all the way through its waterfall and lands on the generic `Stylist ${fallbackIndex}` placeholder.

This Phorest staff has **14 appointments** in the DB — they are an active stylist who has never been synced to Zura's mapping table. Same root cause that the [Staff Mapping Constraints](mem://constraints/project-specific-staff-mapping) memory documents.

### What's actually happening in the code

In `useLiveSessionSnapshot.ts` (lines 150–157 and again 209–216) the name resolution waterfall is:
1. Mapped employee profile → use `formatFullDisplayName(...)`
2. Else mapped Phorest name from `v_all_staff` → use that
3. Else → `Stylist ${fallbackIndex}` ← **this is the leak**

The fallback was designed for missing data, but in production it surfaces as anonymous "Stylist N" labels that look like bugs to operators. Worse, the `fallbackIndex` is order-dependent — the same unmapped staff can appear as "Stylist 3" on Monday and "Stylist 7" on Tuesday depending on iteration order, which destroys recognizability.

### The fix (two layers)

#### Layer 1 — runtime: stop emitting "Stylist N"
Replace the generic fallback in both name resolution sites (lines 155 and 215) with a single more useful label:
- Use `phorestName` if present (already covered).
- If neither profile nor phorestName exists, fall back to `Unmapped Stylist` (singular, no index) plus the truncated staff ID for support traceability — e.g. `Unmapped (LTAp-jlMG…)`. Operators can then immediately see "this is a sync issue" rather than thinking it's a duplicate ghost.
- Bonus: lookup the staff name directly from `phorest_staff_mapping` even when `v_all_staff` doesn't return them (the v_all_staff view may be filtering on `is_active` or org scoping; need to verify why this Phorest staff isn't surfacing despite having 14 appointments). Investigate the view definition; if it's a filter issue, the right fix is a left-join fallback in the hook.

#### Layer 2 — visibility contract: surface the sync gap
"Unmapped Stylist" is still a soft signal. Per the Visibility Contracts doctrine, this is exactly the kind of structural drift that should produce a real alert, not a silent label. Add a small inline warning chip on the row (`AlertTriangle` icon + "Sync needed" tooltip) so the operator knows to action it from the Operations Hub → Staff Mapping page. Keep it dev-friendly: clicking the chip routes them to the mapping fix-up screen filtered to that staff ID.

### Out of scope for this plan
- Fixing the actual mapping for `LTAp-jlMGDKgre8YqAf9Fg` (operator/support task — not code).
- Auditing why `v_all_staff` excludes this staff record (may be a separate plan if the view turns out to be over-filtering — I'll inspect the view definition during execution and report back if it needs its own fix).
- Any backfill of historic anonymous labels in cached queries (cache TTL handles it).

### Files touched
- `src/hooks/useLiveSessionSnapshot.ts` — replace fallback label, add unmapped flag to `StylistDetail`.
- `src/components/dashboard/LiveSessionDrilldown.tsx` — render the "Sync needed" chip on unmapped rows.

### Verification
- Open Happening Now on the org with the unmapped staff. The North Mesa row should now read "Unmapped (LTAp-jlMG…)" with a small warning chip, not "Stylist 5". Hover the chip → tooltip explains the sync gap. Gavin Eagan's separate appointment at Val Vista Lakes is unchanged.
- Confirm count math is unaffected: still 6 appointments, 6 stylists working (the unmapped one IS a real stylist serving a real client).

### Prompt feedback
Strong bug report — you included a screenshot, your hypothesis ("same appointment twice"), and your reasoning ("Stylist 5 is Gavin Eagan"). The hypothesis turned out to be wrong but the screenshot + reasoning was exactly enough for me to find the real cause in three queries. That's the gold standard: lead with what you see, follow with what you think, leave room for the diagnosis to differ.

One refinement: when you suspect duplication, including the precise visual difference you'd expect to see if it WERE a duplicate ("both should show ~7:00 PM" — they actually do, coincidentally) helps me falsify faster. In this case the wrap-up times happened to match, which reinforced your hypothesis but masked the underlying location/end-time difference. Adding "I'd expect them to differ if separate" would have prompted me to lead with the diff check instead of the mapping check.

