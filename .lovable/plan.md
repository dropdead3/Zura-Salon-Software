

# 10 Stylist-First Features — Implementation Plan

## Feature Assessment

| # | Feature | Existing Infrastructure | New Work Required |
|---|---------|------------------------|-------------------|
| 1 | 3-Second Rebook | Rebooking gate exists in `CheckoutSummarySheet` with Yes/No + decline reasons. Missing: smart next-visit suggestion with service-aware interval + one-tap date buttons. | Moderate — enhance existing checkout flow |
| 2 | Client Memory Panel | `useInstantFormulaMemory`, `useClientVisitHistory`, `InstantFormulaCard` exist. Missing: unified panel combining formula + notes + retail + photo + processing time in one view. | Moderate — compose existing hooks into new panel |
| 3 | Color Timer Intelligence | No processing timer exists. Mix sessions track products but not application timing. | New — timer state management + UI |
| 4 | Income Forecast | Revenue forecasting exists for owners (`useRevenueForecast`). No stylist-scoped earnings view. | Moderate — new hook filtering by staff + commission calc |
| 5 | No-Show Protection | Deposit configuration exists on services (`requires_deposit`, `deposit_type`, `deposit_amount`). No risk scoring or auto-suggestion. | Moderate — risk scoring engine + booking integration |
| 6 | Instant Service Pricing | Services have `price`, `cost`, `duration_minutes`. Backroom has chemical cost data. Missing: unified pricing calculator. | Moderate — pure engine + UI component |
| 7 | One-Tap Formula Favorites | `client_formula_history` + `useCloneFormula` exist. Missing: personal favorites (bookmarked formulas). | New table + hook + UI |
| 8 | Client Photo Timeline | No client photo storage exists (only meeting notes photos and profile photos). | New — storage bucket + table + timeline UI |
| 9 | Service Duration Learning | `phorest_appointments` has `start_time`/`end_time`. `useServiceEfficiency` tracks efficiency. Missing: personal duration insights for stylists. | Moderate — new aggregation hook + display |
| 10 | Automatic Retail Suggestions | Service-to-product mapping exists in `service_recipe_baselines`. No retail recommendation engine. | Moderate — mapping table + suggestion engine |

## Scope Decision

These 10 features span significant surface area. I recommend implementing them in 3 phases to ship value fast.

### Phase 1 — Highest Impact (this build)

**Features 1, 2, 3, 4** — These are daily-use features that touch the appointment workspace directly.

### Phase 2

**Features 7, 8, 9** — Formula favorites, photo timeline, duration learning.

### Phase 3

**Features 5, 6, 10** — No-show protection, pricing calculator, retail suggestions.

---

## Phase 1 Implementation Details

### Feature 1: 3-Second Rebook

**Enhancement to `CheckoutSummarySheet.tsx`**

Add a `NextVisitRecommendation` component rendered inside the rebooking gate section (before the Yes/No buttons).

- New pure function: `src/lib/scheduling/rebook-recommender.ts`
  - `getRecommendedRebookInterval(serviceName, serviceCategory)` — returns `{ weeks: number, label: string }[]` based on service type (color: 6-8 weeks, cut: 4-6 weeks, highlight: 8-10 weeks)
  - `getSuggestedDates(intervals, fromDate)` — returns concrete dates
- New component: `src/components/dashboard/schedule/NextVisitRecommendation.tsx`
  - Shows service-aware interval buttons ("Book 6 Weeks", "Book 8 Weeks")
  - Each button shows the target date
  - Tapping opens the booking popover pre-filled with client, stylist, service, and date
  - "Skip" proceeds to decline flow
- Wire into `CheckoutSummarySheet` rebooking gate section, replacing the current 2-button grid with the recommendation + skip

### Feature 2: Client Memory Panel

**New component: `src/components/dashboard/schedule/ClientMemoryPanel.tsx`**

Composes existing hooks into a single unified view:
- `useInstantFormulaMemory` — last formula
- `useClientVisitHistory` — last visit notes, processing time
- Query `phorest_appointments` for last retail purchase (from POS transaction data)
- Shows: Last Formula | Last Notes | Last Retail | Last Processing Time
- Rendered inside `AppointmentDetailSheet` as a new tab or prominent section

**New hook: `src/hooks/useClientMemory.ts`**
- Single hook that fetches all 4 data points in parallel
- Returns `{ lastFormula, lastNotes, lastRetail, lastProcessingTime, isLoading }`

### Feature 3: Color Timer Intelligence

**New state + UI for processing timers in the appointment workspace.**

- New hook: `src/hooks/backroom/useProcessingTimers.ts`
  - In-memory timer state (not persisted — ephemeral per session)
  - `startTimer(bowlId, label)`, `stopTimer(bowlId)`, `getElapsed(bowlId)`
  - Optional: store processing times to `mix_sessions` metadata for duration learning
- New component: `src/components/dashboard/backroom/ProcessingTimerBar.tsx`
  - Shows active timers as compact pills: "Bowl 1 — 12:04 — 23/35 min"
  - Alert state when timer exceeds target (amber at 90%, red at 100%)
  - Integrates with blueprint `processing_step` recommended times
- Wire into mix session workspace and appointment detail view

### Feature 4: Stylist Income Forecast

**New hook + component for stylist-scoped earnings prediction.**

- New hook: `src/hooks/useStylistIncomeForecast.ts`
  - Queries `appointments` + `phorest_appointments` for current week, filtered by `staff_user_id`
  - Calculates: booked revenue, estimated earnings (using commission rate from `employee_profiles` or org default)
  - Identifies open slot value using `services.price` × available slots
- New component: `src/components/dashboard/stylist/IncomeForecastCard.tsx`
  - Card showing: Week Forecast | Booked Revenue | Expected Earnings | Open Slot Value
  - Compact design suitable for stylist dashboard top section
  - Color-coded progress indicator

---

## Database Changes

### Feature 7 (Phase 2 — noted for planning)
- New table: `formula_favorites` (user_id, organization_id, name, formula_data jsonb)

### Feature 8 (Phase 2 — noted for planning)
- New table: `client_photos` (client_id, organization_id, photo_url, appointment_id, notes, taken_at)
- New storage bucket: `client-photos`

No database changes needed for Phase 1 — all features use existing tables and in-memory state.

## Build Order (Phase 1)

1. `rebook-recommender.ts` — pure rebook interval logic
2. `NextVisitRecommendation.tsx` — rebook UI + wire into `CheckoutSummarySheet`
3. `useClientMemory.ts` — composite client context hook
4. `ClientMemoryPanel.tsx` — unified panel + wire into `AppointmentDetailSheet`
5. `useProcessingTimers.ts` — ephemeral timer state
6. `ProcessingTimerBar.tsx` — timer display component
7. `useStylistIncomeForecast.ts` — stylist earnings hook
8. `IncomeForecastCard.tsx` — earnings card for stylist dashboard

## Edge Cases

| Case | Handling |
|---|---|
| Service with no rebook interval mapping | Default to 6 weeks; show generic "Book Next Visit" |
| New client (no history) | Memory panel shows empty state: "First visit" |
| No commission rate configured | Income forecast shows revenue only, note "earnings estimate unavailable" |
| Timer left running after checkout | Auto-clear timers when appointment status changes to completed |
| Client has no formula history | Formula section shows "No previous formula on file" |

