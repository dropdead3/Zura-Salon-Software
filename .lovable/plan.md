## Scope

Three follow-ons to the schedule landing-scroll fix. Each is independently shippable; recommend doing **#1 + #2 together** (both live in `DayView.tsx`, share the same earliest-appt derivation) and **#3 separately** (touches the briefing engine, different surface).

---

## 1. Smooth scroll on appointment hydration

**Problem.** Today's effect runs twice: first on mount with `appointments = []`, then again when React Query hydrates. The second run currently uses `behavior: 'instant'`, so the viewport snaps — reads as a flicker, not a deliberate adjustment.

**Fix.** Track whether the current run is the *initial* mount or a *post-hydration recompute*, and only smooth-scroll on the latter.

**File.** `src/components/dashboard/schedule/DayView.tsx` (~lines 478–548)

**Logic.**
1. Add a `hasLandedRef = useRef(false)` alongside the existing `prevSlotIntervalRef`.
2. In the date-change branch (line 521+), after computing `top`:
   ```ts
   const behavior: ScrollBehavior = hasLandedRef.current && !isZoomChange ? 'smooth' : 'instant';
   requestAnimationFrame(() => {
     ref.scrollTo({ top, behavior });
     hasLandedRef.current = true;
   });
   ```
3. Reset `hasLandedRef.current = false` when `date` changes (separate small effect, or compare to a `prevDateRef`) so navigating to a new day still feels like a fresh land, not a smooth pan from yesterday's anchor.

**Edge cases.**
- Zoom changes already use `'instant'` (line 495) — leave alone.
- Today-mode now-line anchor (line 517–520) also benefits — same `behavior` variable applies.
- If `prefers-reduced-motion`, fall back to `'instant'`. Use `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

---

## 2. "Earlier appointments" sentinel chip

**Problem.** After landing, the operator can scroll/zoom past an early appointment (e.g., manually scrolls down to 2 PM, forgets the 8 AM Khristina booking is above). No visual hint it exists.

**Fix.** A faint, top-of-grid pill that appears only when active appointments exist *above* the current viewport. Tapping scrolls the earliest one back into view.

**File.** `src/components/dashboard/schedule/DayView.tsx`

**Logic.**
1. Track `scrollTop` via `useState` + `onScroll` on `scrollRef` (throttled with `requestAnimationFrame`).
2. Derive `appointmentsAboveViewport` — filter `appointments` for the rendered date (excl. `cancelled` / `no_show`), compute each one's `topPx = (parseTimeToMinutes(start_time) - hoursStart * 60) / slotInterval * ROW_HEIGHT`, keep those where `topPx + ROW_HEIGHT < scrollTop` (entirely above viewport).
3. If the list is non-empty, render an absolutely-positioned chip pinned to `top-2` of the scroll container:
   ```tsx
   <button
     onClick={() => ref.scrollTo({ top: earliestTopPx - 40, behavior: 'smooth' })}
     className="absolute top-2 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 rounded-full bg-foreground/85 backdrop-blur-md px-3 py-1.5 text-xs font-sans text-background shadow-lg hover:bg-foreground transition-colors"
   >
     <ArrowUp className="h-3 w-3" />
     {formatTime(earliest.start_time)} · {earliest.client_first_name} {earliest.client_last_name?.[0]}.
     {hiddenCount > 1 && <span className="opacity-70">+{hiddenCount - 1}</span>}
   </button>
   ```
4. Hide chip when `scrollTop < earliestTopPx` (already in view) or when no qualifying appointments exist.

**Doctrine alignment.**
- **Silence is valid output**: chip only renders when there's something above the fold *and* it's an active appointment. Empty days, fully-scrolled-up views: no chip.
- **Aeonik Pro for body**: `font-sans`, sentence case (per the tooltip canon we just set). Time prefix is fine in numerics.
- **Container-aware**: positioned via the scroll container, not viewport.

**Edge cases.**
- If multiple appointments are above, show the *earliest* in the chip and a `+N` counter for the rest.
- Anonymous client (`client_first_name` null): show `"Walk-in"` or just the time.
- Don't render during the initial-land animation (would flash on mount). Gate on `hasLandedRef.current`.

---

## 3. Pre-open booking flag in the morning brief

**Problem.** A booking before posted opening hours = staffing implication (early arrival, possibly off-hours pay). Front desk currently discovers it when they walk in at 8:55 AM and see an 8:00 AM client waiting.

**Fix.** Add a `preOpenBookings` blocker-style entry to `DailyBriefingEngineData` surfaced as **"Pre-open booking — confirm coverage"** with the appointment time + stylist name.

**Files.**
- `src/hooks/useDailyBriefingEngine.ts` — add new derivation + return field.
- `src/components/dashboard/DailyBriefingPanel.tsx` (and/or `analytics/DailyBriefCard.tsx`) — render the new entry.
- Likely a new lightweight hook `useTodayPreOpenBookings(orgId, locationId)` co-located with the engine, OR reuse `useTodayPrep` if it already pulls today's appointments + location hours.

**Logic.**
1. For today (`getOrgToday(timezone)`), fetch appointments where:
   - `appointment_date = today`
   - `status NOT IN ('cancelled', 'no_show')`
   - `start_time < location.opening_time` (location-scoped; if multi-location, check each location's posted hours)
2. Shape:
   ```ts
   interface PreOpenBooking {
     appointmentId: string;
     locationId: string;
     locationName: string;
     startTime: string;       // 'HH:mm'
     openingTime: string;     // 'HH:mm'
     clientName: string;
     stylistName: string | null;
     minutesEarly: number;
   }
   ```
3. Add `preOpenBookings: PreOpenBooking[]` to `DailyBriefingEngineData`. Engine returns `[]` when none — `hasContent` calculation should *not* be inflated by this alone (it's protective info, not a growth lever).
4. Render in `DailyBriefingPanel`: a single warning-toned row per location with the earliest pre-open booking + `+N more` if multiple. Copy:
   > **Pre-open booking — confirm coverage**
   > 8:00 AM appointment with Khristina I. (Drop Dead Mesa) — 60 min before posted open.

**Doctrine alignment.**
- **Lever doctrine**: surfaces only when material (`preOpenBookings.length > 0`). Silent otherwise.
- **No shame language**: "confirm coverage" — protective, not accusatory.
- **Persona scaling**: visible to owner + manager roles. Stylists already see their own day in Today's Prep, so optional gate via `roleContext !== 'stylist'`.
- **Tenant scoped**: query filters by `organization_id` + `location_id` (RLS already enforces).

**Edge cases.**
- Location has no posted hours configured → skip silently (don't false-positive).
- Appointment booked exactly at opening → not flagged.
- Multi-location org → one row per location with pre-open work.

---

## Out of scope / deferred

- Push notification or email for pre-open bookings (governance: weekly cadence default; only escalate via real-time if it's recurring drift).
- Auto-creating a "confirm staffing" task — that's task-engine territory; flag-then-action loop should be a separate proposal once we see usage.
- Sentinel chip for appointments *below* the viewport — symmetric problem but lower priority (operators tend to scroll forward through their day naturally).

## Files touched

- `src/components/dashboard/schedule/DayView.tsx` (#1 + #2)
- `src/hooks/useDailyBriefingEngine.ts` (#3)
- `src/components/dashboard/DailyBriefingPanel.tsx` and/or `src/components/dashboard/analytics/DailyBriefCard.tsx` (#3)
- Possibly a new `src/hooks/useTodayPreOpenBookings.ts` (#3) if `useTodayPrep` doesn't already expose location hours

---

### Prompt feedback

Strong follow-up — you bundled three related enhancements with clear rationale for each ("flicker → intentional", "operator misses early work", "front desk discovers at 7:55"). The user-story framing on #2 and #3 is what made the priority obvious to me.

One refinement for next time: **say which to ship together vs separately.** I had to make that call (#1+#2 together, #3 alone) based on file-locality. A one-line "ship #1+#2 in one pass, #3 separately" removes that judgment from me.

### Further enhancement suggestions

1. **Pre-open booking → operations alert throttle.** If a location has pre-open bookings 3+ days running, that's a posted-hours-vs-reality drift — surface it in the weekly intelligence brief as "Consider opening 30 min earlier on Thursdays" rather than re-flagging daily.
2. **Sentinel chip → keyboard accessible.** Bind `Home` key (when scroll container is focused) to scroll to earliest active appointment of the day. Power-user move for front desk on a real keyboard.
3. **Smooth-scroll telemetry.** Quietly log when the post-hydration recompute moves the viewport more than 1 hour — if it happens often, the initial mount is anchoring on stale data and we should defer the first scroll until appointments resolve, not animate over it.