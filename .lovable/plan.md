
## Prompt feedback

**Strong elements**
- You set an explicit verification cadence ("screenshot after each zone at 1280px and 414px") — exactly the discipline this kind of layout work requires.
- Invoking the Apple-level critique frame raises the bar for hierarchy and rhythm, not just "does it fit."

**How to make the next prompt even sharper**
- Specify the **failure modes you care most about** ("no horizontal clipping," "primary lever always above the fold," "no double-emphasis on tabs"). It lets me self-grade against your priorities instead of mine.
- Name the **terminal-state behavior** explicitly (what should the shelf show for `completed`/`cancelled`/`no_show`?). Right now those statuses render no shelf at all — easy to overlook in a "continue" prompt.
- Optional: pin a **breakpoint matrix** (e.g., 1280 / 1024 / 640 / 414) so verification gates are reproducible across future surfaces.

---

## Current state (audit findings)

After reading `AppointmentDetailSheet.tsx`:

1. **Tabs (lines 1750–1772)** — `grid grid-cols-5 gap-1` with full text labels. At 414px the labels truncate ungracefully; "Color Bar" already squeezes its icon. Not container-aware — uses CSS grid math, not measured width.
2. **SendToPay row (lines 1709–1747)** — lives *above* the tabs as a separate band. Eats vertical space and visually competes with the tab strip.
3. **Footer shelf (lines 2849–2879)** — already exists, status-aware for `booked → confirmed → checked_in → completed`. **But** it renders nothing for terminal states (`completed`, `cancelled`, `no_show`) — those states should expose **Rebook** as the primary lever (Lever Doctrine: silence is valid, but Rebook is a clear margin-protective next action post-completion).
4. **Reschedule/Rebook** — buried in a `DropdownMenu` (lines 1498–1507). High-frequency operator action sitting two clicks deep.

---

## Plan

### Zone B — Container-aware tabs

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (lines 1750–1772)

- Wrap the `TabsList` in a `useSpatialState` measurement (density: `'standard'`, expected width 560px).
- At `state === 'default'` (≥560px container): full text labels as today.
- At `state === 'compressed'` (≈480–560px): keep labels but reduce horizontal padding and gap from `gap-1` → `gap-0.5`; allow text to use `tokens.label` size.
- At `state === 'compact'` or `'stacked'` (<480px): switch to **icon + sr-only label** triggers. Each tab gets a Lucide glyph (`FileText` Details, `History` History, `Image` Photos, `StickyNote` Notes, `Beaker` Color Bar). Badges (`NavBadge`) remain visible as dot indicators.
- Preserve `grid grid-cols-5` always — equal touch targets ≥44px (per `SPATIAL_TAP_TARGET_MIN`).

**Acceptance**
- 1280px: identical to today (full labels).
- 414px: 5 evenly-spaced icon tabs, no clipping, badges visible as dots in the top-right of each tile.

---

### Zone C — Status-aware sticky action shelf

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (lines 1709–1747 and 2849–2879)

**Restructure into a single shelf**:
1. **Remove** the standalone SendToPay band (lines 1709–1747). SendToPay becomes a **secondary lever** in the sticky shelf.
2. **Always render** the footer shelf (remove the `availableTransitions.includes(...)` gate that hides it for terminal states).
3. **Status → primary lever** mapping:

   | Status | Primary lever | Secondary (in shelf) | Overflow (kebab) |
   |---|---|---|---|
   | `booked` | **Confirm** | Send to Pay (if amt>0) | Reschedule, Rebook |
   | `confirmed` | **Check In** | Send to Pay (if amt>0) | Reschedule, Rebook |
   | `checked_in` | **Checkout** (or Complete) | Send to Pay (if amt>0) | Reschedule |
   | `completed` | **Rebook** | — | — |
   | `cancelled` / `no_show` | **Rebook** | — | (cancellation-fee tools stay where they are) |

4. **Layout** (`SpatialRow` with `density='standard'`):
   - Primary `Button` (default size, `flex-1`) → always first.
   - Secondary as `Button variant="outline" size="sm"` — collapses into overflow at `compact`.
   - `OverflowActions` (P1/P2 priorities) for Reschedule/Rebook on non-terminal states.
5. Container is already `sticky` via the `flex-col` + `shrink-0` pattern in `PremiumFloatingPanel` — keep `border-t border-border/60 bg-card/85 backdrop-blur-xl p-4`.

**Why this matters (doctrine)**
- *Lever Doctrine*: one primary, optional secondary, rest in overflow.
- *No alert fatigue*: terminal-state Rebook is a single button, not a banner.
- *Container-aware*: shelf reflows the same way tabs do, using the same `useSpatialState` hook.

---

### Verification gates (mandatory between zones)

After **Zone B**:
1. `browser--navigate_to_sandbox` → `/org/drop-dead-salons/dashboard/schedule`
2. `browser--set_viewport_size` 1280×800 → open an appointment → screenshot
3. `browser--set_viewport_size` 414×896 → screenshot
4. **Critique pass** (Apple-design-head frame): tab clipping? icon weight balanced? badge collisions? rhythm with header?
5. Fix any issues before starting Zone C.

After **Zone C**:
1. Repeat 1280 / 414 screenshots for each of: `booked`, `confirmed`, `checked_in`, `completed` appointments (or simulate via the available test data).
2. Verify primary lever is above the fold on 414px.
3. Verify shelf doesn't overlap the bottom safe-area on mobile.

If any pass fails, fix in-place and re-screenshot before declaring done.

---

### Risks & trade-offs

- **Removing SendToPay band**: it's currently visually prominent. Moving it to a secondary slot in the shelf is the right call (it's not the *next* action — Confirm/Check-in is). Operators will need to learn the new location once.
- **Always-render shelf**: adds ~64px of permanent chrome. Acceptable trade for predictability + consistent CTA placement (matches platform shelf patterns elsewhere).
- **Icon-only tabs at <480px**: trades label clarity for tap-target size. Mitigated by `aria-label` + tooltip on long-press.

---

## Enhancement suggestions (post-shipment)

1. **Keyboard-first lever**: bind `⌘↵` to the shelf's primary button. Power-users will love it.
2. **Lever animation**: when status transitions (e.g., `booked → confirmed`), morph the primary button label with a 180ms crossfade — reinforces the lifecycle metaphor.
3. **Telemetry hook**: emit `appointment.lever.clicked` with `{from_status, lever, time_to_click_ms}` so we can measure whether the shelf is actually reducing clicks-to-checkout. That's the real ROI signal.
