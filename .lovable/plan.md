

## Prompt review

Clear two-part prompt — names the surface, the new control (sort by price), and a missing element (level labels). Sharper next time: tell me the **default sort** you want (low→high or by relevance/qualification?), and whether sort should persist across bookings or reset each open. I'll propose defaults and flag.

## Diagnosis

**Level labels:** The component already renders `<Badge>Level {N}</Badge>` (lines 2052–2056) — but the screenshot shows none. Root cause: those stylists have no `employee_profiles.stylist_level` value set, so `getLevelNumber()` returns null and the badge is suppressed. This is a **data gap**, not a UI bug. The fix is two-fold:

1. **Render a fallback** ("Unranked" or hide gracefully) so the row shape is consistent
2. **Surface the data gap** so admins know to assign levels in Operations Hub

**Sort by price:** The price column already computes per-stylist (`stylistTotalPrice`, line 2006–2011) using level-based service pricing. Adding sort is purely client-side reordering of `filteredStylists` — no new queries.

## Plan — Wave 22.2: Stylist picker sort + level visibility

### 1. Sort control (top-right of "Available Stylists" header)

Add a compact dropdown/segmented control next to the section heading:
- **Recommended** (default — current order: previous stylist first, then qualified, then alphabetical)
- **Price: Low → High**
- **Price: High → Low**
- **Level: Low → High**
- **Level: High → Low**

Implementation: `useState<SortMode>('recommended')` inside the popover; sort `filteredStylists` (and `uniqueAllStylists` for stylist-first mode) via `useMemo`. Sort resets to default each time the popover opens.

UI: `Select` component (shadcn) with `tokens.label` styling, sized `h-8`, placed inline-right of the "AVAILABLE STYLISTS" heading using `flex justify-between`.

Hidden when `selectedServices.length === 0` (no price to sort by) — falls back to Level sort options only in that case.

### 2. Level badge — always visible

Change behavior:
- If `stylistLevelNum` exists → render `Level {N}` badge as today
- If null → render `Unranked` badge with `variant="outline"` and muted text (signals data gap without breaking layout)

Optionally: in dev mode, log a warning so admins see the missing-level list in console.

### 3. Acceptance checks

1. Sort dropdown appears top-right of "Available Stylists" header; defaults to "Recommended"
2. Switching to "Price: Low → High" reorders rows by `stylistTotalPrice` ascending
3. Switching to "Level: High → Low" puts Level 4 first, Unranked last
4. Stylists without a `stylist_level` show an "Unranked" badge (not blank)
5. Sort resets to "Recommended" when popover reopens
6. Stylist-first mode: same sort works against `uniqueAllStylists`
7. No regression to previous-stylist auto-pin (still wins in "Recommended" mode)

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — add sort state, sort memo, Select control in stylist step header, fallback "Unranked" badge

### Open question (worth flagging)

**Why are levels blank?** This screenshot shows 7 stylists at North Mesa, none with a level. Either (a) admins haven't assigned levels in Operations Hub → Stylist Levels, or (b) the `stylist_level` field isn't being read from the right column. Worth a one-query verification:

```sql
SELECT user_id, full_name, stylist_level FROM employee_profiles 
WHERE user_id IN (<the 7 stylist ids>);
```

If it's (b), Wave 22.3 fixes the read path; if (a), the "Unranked" badge is the right outcome and Operations Hub gets a nudge.

### Deferred

- **P2** Persist last-used sort per user (localStorage) — trigger: when staff request "remember my preference"
- **P2** Show level price tier ($, $$, $$$) instead of "Level N" for client-facing booking surfaces — trigger: not applicable here (staff-facing), revisit if booking widget reuses this UI
- **P2** "Filter by level" multi-select chips above the list — trigger: when a salon with 20+ stylists across many levels needs it

