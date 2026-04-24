
## Goal
Refactor `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` into three discrete zones inside the existing 640px `PremiumFloatingPanel`, verifying each zone with browser screenshots at default (1119px viewport, panel ≈640px), compressed (~520px), and mobile (414px) before advancing to the next.

## Doctrine anchors
- `mem://style/drawer-canon` — keeps `PremiumFloatingPanel` (no Sheet)
- `mem://style/container-aware-responsiveness` — uses `useSpatialState` for tabs/actions, not viewport queries
- Container-aware primitives in `src/components/spatial/*` (`OverflowActions`, `SpatialRow`)
- Lever Doctrine — one primary lever, optional secondary, status-derived

---

## Zone A — Identity Header (sticky top, structurally compacted)
**Lines targeted:** 1477–1676

1. **Remove dev/legacy noise**
   - Delete the two `Source: Native` / `Source: Synced (legacy)` badges (lines 1640–1648). They are platform-internal telemetry, not operator signal.
2. **Promote View Profile**
   - Replace the inline text+icon "View Profile" link (lines 1599–1608) with a `Button variant="ghost" size="icon"` carrying a `User` icon, placed inline next to the client name in the title row (1577–1585). Tooltip: "View client profile".
3. **Prioritize the chip strip**
   - Single horizontal `SpatialRow` directly below the name containing, in this order: Status badge, Walk-In, Redo, Recurrence, New, confirmation method (text-muted span). Drop the standalone "Status + Dropdown" container (1612–1649) and consolidate into one row that wraps gracefully via `SpatialRow`'s built-in `compact → flex-wrap` and `stacked → flex-col` behavior.
4. **Lifecycle stepper redesign**
   - Replace the current "only-current-label" stepper (1652–1675) with a 4-segment stepper that always renders all four labels (`Unconfirmed → Confirmed → Checked In → Completed`) using `tokens.label` styles. Active steps fill `bg-primary`, future steps `bg-muted`, current step gains a subtle ring. At `compact` state collapse labels to first letter only; at `stacked` keep the bar but hide labels.
   - Terminal states (cancelled / no_show) keep the existing destructive bar but add the terminal label inline.

**Zone A QA gate (screenshots required):**
- 1119px viewport → header should fit without scroll
- Resize panel mentally (we cannot resize the panel itself, but we can resize viewport to 414px → panel goes full-width per `PremiumFloatingPanel`) and screenshot
- Verify: no overflow, chips wrap, View Profile button reachable, lifecycle labels readable

---

## Zone B — Container-aware Tabs
**Lines targeted:** 1742–1764

1. Wrap the `<TabsList>` block in a `useSpatialState` measurement (or place it inside a `SpatialRow`-style wrapper).
2. At `default`/`compressed`: keep current text labels.
3. At `compact`/`stacked`: render icon-only triggers with `aria-label` for each (Details=`Info`, History=`History`, Photos=`Image`, Notes=`StickyNote`, Color Bar=`Beaker`). Preserve the unread count badges.
4. Keep `grid grid-cols-5` so tabs remain equal-width; switch label visibility, not layout.

**Zone B QA gate:**
- Screenshot at 1119px (full labels) and 414px (icon-only)
- Verify badges still float, no clipping, active state visible in both modes

---

## Zone C — Sticky Action Shelf (status-aware lever)
**Lines targeted:** replace 2842–2872 (existing footer) and consume the orphaned SendToPay block (1702–1740)

1. **One sticky shelf** at panel bottom: `sticky bottom-0 p-4 border-t border-border/60 bg-card/85 backdrop-blur-xl shrink-0 z-20`.
2. **Status-derived primary lever** (single `Button` with `flex-1`):
   - `pending` / `booked` / `unconfirmed` → **Confirm** (`handleStatusChange('confirmed')`)
   - `confirmed` / `walk_in` → **Check In** (`handleStatusChange('checked_in')`)
   - `checked_in` → **Checkout** (`onPay(appointment)` if available, else **Complete**)
   - `completed` → **Rebook** (`onRebook(appointment)`) when handler exists
   - `cancelled` / `no_show` → **Reschedule** (`onReschedule(appointment)`) when handler exists
   - If no lever applies, hide the primary button (silence is valid output).
3. **Secondary lever:** `SendToPayButton` rendered inline in the shelf (keep its existing eligibility check) — moved out of the orphaned 1702–1740 block, which gets deleted.
4. **Overflow:** Add an `OverflowActions` instance carrying `Reschedule` (P1), `Rebook` (P1), `Reassign Stylist` (P2), `Transactions` (P2). The header's existing kebab keeps Status Override + Admin (Delete) only — splits high-frequency vs. governance actions.

**Zone C QA gate:**
- Open three appointments in three statuses (booked/checked_in/completed) via the schedule
- Screenshot each: confirm primary lever changes, sticky shelf stays pinned while scrolling tab body
- 414px screenshot to confirm shelf doesn't clip primary CTA

---

## Verification methodology (per your directive)
After each zone is implemented in default mode:
1. `browser--navigate_to_sandbox` to `/org/drop-dead-salons/dashboard/schedule`
2. Click an appointment to open the panel
3. `browser--screenshot` at 1119×849 (current), then `browser--set_viewport_size` to 414×896 and screenshot again
4. If the screenshot reveals overflow, clipping, or hierarchy issues, fix in-place before advancing to the next zone

I will pause and report screenshots between zones so you can approve before I move on.

## Files touched
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (only file)

## Out of scope (deliberate)
- Tab body layouts (Details / History / Photos / Notes / Color Bar) — separate follow-up
- Photo grid 3-column reflow at 640px — separate enhancement
- "Show More" toggle for 5+ services — separate enhancement
- Any backend or status-machine logic changes — purely presentational
