

## Three Client Intelligence Enhancements

### 1. Wire `stylist_user_id` onto DockAppointment

**Problem:** `stylist_user_id` is already fetched from `phorest_appointments` but dropped during the mapping to `DockAppointment`. Line 203 in `DockClientTab` hardcodes `currentStylistDiffers = false`.

**Fix:**
- **`src/hooks/dock/useDockAppointments.ts`** — Add `stylist_user_id?: string | null` to the `DockAppointment` interface. Include `stylist_user_id: a.stylist_user_id || null` in all 3 mapping locations (lines ~120-134, ~157-172, and the personal query mapping ~200+).
- **`src/components/dock/appointment/DockClientTab.tsx`** — Replace the hardcoded `const currentStylistDiffers = false` with an actual comparison: `const currentStylistDiffers = !!preferredStylistId && !!appointment.stylist_user_id && appointment.stylist_user_id !== preferredStylistId`. The amber warning UI is already built and will activate.

### 2. Quick-Tap Formula Re-Use from History Timeline

**Problem:** Formula history cards in the Client tab are read-only. Stylists should be able to tap a past formula to clone it into an active bowl.

**Approach:**
- Add a `Copy` icon button on each formula history card in `DockClientTab`
- On tap, use the existing `useCloneFormula` hook which inserts formula lines into a target bowl
- Need to know the active bowl ID — pass it via props from `DockAppointmentDetail` which has access to the current mix session context
- If no active bowl exists, show a toast prompting the stylist to create a bowl first

**Changes:**
- **`src/components/dock/appointment/DockClientTab.tsx`** — Add optional `activeBowlId` prop. Import `useCloneFormula`. Add a `Copy` button on each formula history card that calls `cloneFormula.mutate({ bowlId, formulaLines })`. Show loading state on the button while cloning.
- **`src/components/dock/appointment/DockAppointmentDetail.tsx`** — Query the active mix session's first open bowl (from `mix_bowls` where `status = 'open'` for the appointment's session) and pass `activeBowlId` to `DockClientTab`.

### 3. Product Recommendations Based on Formula + Retail Cross-Sell Patterns

**Problem:** No product suggestions are surfaced. When a client uses specific color/treatment products, there are complementary retail products (e.g., color-safe shampoo for color services).

**Approach — Lightweight, data-driven:**
- Create a new section "Suggested Retail" in `DockClientTab` below Frequently Purchased
- Query logic: Look at the client's current service name + formula products → match against `phorest_transaction_items` from *other clients* who had similar services and also bought retail
- For MVP: use a simpler heuristic — surface the top 3 retail products purchased by clients who had the same `service_name` at this org, excluding products the client already buys frequently
- Query `phorest_transaction_items` grouped by `item_name` where `item_type = 'product'`, joined to appointments with matching service names, limited to top 3 by count

**Changes:**
- **`src/components/dock/appointment/DockClientTab.tsx`** — Add a new `useQuery` for cross-sell recommendations. Render a "Suggested Retail" section with `Sparkles` icon, showing product name + "X clients with similar services bought this" subtitle. Cards styled as subtle recommendation pills with `bg-violet-500/5 border-violet-500/15`.

### Files Summary

| Action | File |
|--------|------|
| Modify | `src/hooks/dock/useDockAppointments.ts` — add `stylist_user_id` to interface + all mappings |
| Modify | `src/components/dock/appointment/DockClientTab.tsx` — enable stylist diff warning, add formula clone button, add cross-sell section |
| Modify | `src/components/dock/appointment/DockAppointmentDetail.tsx` — query active bowl ID, pass to Client tab |

