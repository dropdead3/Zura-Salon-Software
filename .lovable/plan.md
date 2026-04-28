# Replace Locations Rollup with Locations Status

## Why this change

The current `locations_rollup` card surfaces only a static count (e.g. "2 LOCATIONS"). Operators already know how many locations they have — that's not a lever, it's noise. Per Lever Doctrine: if a surface doesn't reduce ambiguity or clarify leverage, it doesn't belong.

There **is** a meaningful version of this surface: a real-time **Locations Status** view that answers "right now, which of my locations are open and which are closed?" — useful only when an org has 2+ locations with differing schedules / holiday closures.

## What gets built

### 1. New component: `LocationsStatusCard`

Path: `src/components/dashboard/analytics/LocationsStatusCard.tsx`

Behavior:
- Pulls `useActiveLocations()` and the user's `accessibleLocations`.
- For each location, computes **right-now** state using existing helpers (`isClosedOnDate`, `getTodayHours`, `getLocationHoursForDate`) plus current local time vs. today's `open`/`close`.
- States per location: `Open` (green dot + "closes 7pm"), `Closed — holiday` (uses holiday name), `Closed — regular hours`, `Closed — outside hours` ("opens 9am" / "opens Mon 9am").
- Header summary: "X of Y open right now".
- Compact list (max 6, "+N more" if exceeded) sorted: Open → Outside hours → Closed.
- Auto-refresh state every 60s via `setInterval` so the card stays accurate without a page reload.

### 2. Materiality / silence gate (Visibility Contract)

Surface returns `null` (not a placeholder card) when:
- `accessibleLocations.length < 2`, OR
- All locations share identical `hours_json` AND zero holiday closures across the set (no differential signal to surface).

When suppressed, emit `reportVisibilitySuppression('locations-status', '<reason>')` with reasons `single-location` and `uniform-schedules` (kebab-case, per Visibility Contract canon).

Suppression hint shown in `DashboardCustomizeMenu` when toggled-on but suppressed (reusing the existing hint pipeline added earlier).

### 3. Simple-view KPI tile

In `PinnedAnalyticsCard.tsx` `case 'locations_rollup'` simple branch — replace the static "X locations" string with a live "X of Y open" value + label "Open right now". Same materiality gate as detailed view.

### 4. Rename the card identity

Keep the stable id `locations_rollup` (avoids a DB migration on `dashboard_element_visibility` and pinned-card preferences for existing orgs), but update all human-facing labels and metadata:

| Anchor | Old | New |
|---|---|---|
| `DashboardCustomizeMenu` label | Locations Rollup | Locations Status |
| `PinnableCard` elementName | Locations Rollup | Locations Status |
| `CARD_META` label | Locations Rollup | Locations Status |
| `CARD_DESCRIPTIONS` | "Number of active locations…" | "Real-time open/closed status across your locations. Surfaces only when multiple locations have differing schedules." |
| Customize-menu category | Operations | Operations (unchanged) |
| Preview tile (`AnalyticsCardPreview`) | LocationsRollupPreview | LocationsStatusPreview |

Also update the two seed migrations' `display_name` via a new forward-only migration that does `UPDATE dashboard_element_visibility SET display_name = 'Locations Status' WHERE element_key = 'locations_rollup';` (safe, idempotent).

### 5. Wire the new component

In both `CommandCenterAnalytics.tsx` and `PinnedAnalyticsCard.tsx` (detailed branch), swap `LocationsRollupCard` → `LocationsStatusCard`. Delete `LocationsRollupCard.tsx` after the swap (no other consumers per `rg`).

### 6. Preview update

Rebuild `LocationsStatusPreview` in `AnalyticsCardPreview.tsx` to mirror the new layout (status pills, "X of Y open" header, sample 3-location list with one closed for holiday).

### 7. Contract test

Extend `src/__tests__/dashboard-section-contract.test.ts` to assert `locations_rollup` has the new label/description and renders both simple and detailed branches without throwing.

## Technical notes

- No DB schema changes. Element key stays `locations_rollup`; only display copy is updated.
- No changes to RLS or the privacy contract — `locations_rollup` remains in `STYLIST_FORBIDDEN_PINNED_CARDS`.
- Materiality suppression follows the project's Visibility Contracts canon (return null + dev suppression log + kebab-case reason).
- Auto-refresh interval cleared on unmount; component is container-aware (no fixed widths).

## Files touched

```
NEW   src/components/dashboard/analytics/LocationsStatusCard.tsx
NEW   supabase migration  (display_name update)
EDIT  src/components/dashboard/CommandCenterAnalytics.tsx
EDIT  src/components/dashboard/PinnedAnalyticsCard.tsx
EDIT  src/components/dashboard/DashboardCustomizeMenu.tsx
EDIT  src/components/dashboard/previews/AnalyticsCardPreview.tsx
EDIT  src/__tests__/dashboard-section-contract.test.ts
DEL   src/components/dashboard/analytics/LocationsRollupCard.tsx
```

---

## Prompt feedback (per your standing instruction)

**What worked well in your prompt**
- You named the failure ("pointless analytic") *and* described exactly when the surface would have value (multi-location, differing hours, currently open vs. closed). That's a clean Signal → Lever framing — much easier to act on than "remove this."
- You implicitly applied the materiality doctrine: the card should be silent when there's nothing differential to say.

**How to sharpen prompts like this further**
1. **State the doctrine anchor explicitly.** e.g. "This violates Visibility Contract — silence is valid output when there's no differential signal." That tells me which canon to enforce, not just which card to fix.
2. **Specify suppression vs. removal.** You said "not needed" but described conditions where it *is* useful. Calling that out as "suppress when single-location, render when multi-location with schedule variance" removes one round trip.
3. **Name the success state.** "I want to glance at the dashboard at 8:55am and instantly know which locations open at 9 vs. 10" gives me a concrete UX target to design against.

**Suggested enhancements beyond this scope**
- **"Closing soon" warning state** (e.g. yellow dot when within 30 min of close) — useful for last-call ops decisions.
- **Click-through to location schedule editor** so a closure-day surprise leads directly to a fix.
- **Anomaly detection**: flag a location open today that's normally closed (or vice versa) — that *is* a leverage signal worth a real-time alert, not just a status pill.
- **Promote to alert** if a location is unexpectedly closed during business hours (staff didn't show, etc.) — graduates this from passive surface to operational tripwire.
