

# Live Bowl, Checkout Clarity Panel, and Manager Exception Inbox

Three UI components that transform existing backend infrastructure into polished, adoption-driving experiences. No schema changes needed -- all data hooks and tables already exist.

---

## 1. Live Bowl Interface

**Current state:** BowlCard is a static card with an "Add Product" flow requiring 3 taps (open search, select product, type weight, tap Capture). The card updates totals but feels like data entry.

**Target:** A full-screen-feeling "mixing console" card that dominates the viewport when a bowl is open, with animated weight display and live running totals including allowance remaining.

### Changes

**New component: `LiveBowlCard.tsx`** (replaces BowlCard rendering for `open` bowls)

- Large weight display area at top using `AnimatedNumber` (already exists) with spring animation as weight updates
- Visual "weight lock" animation: when ManualWeightInput submits, the number settles with a brief scale-in + color flash (green pulse) to indicate capture
- Product line items appear with `animate-fade-in` as they are added -- no extra confirmation step
- Running totals bar pinned at bottom of the card:
  - Total weight (animated)
  - Total cost (animated, blurred via `BlurredAmount`)
  - Allowance remaining (fetched from `service_allowance_policies` via existing `useServiceAllowancePolicies` hook) -- shows green when under, amber when close, red when over
- Streamlined product add: always-visible search input at top of card (not hidden behind "Add Product" button), product tap immediately opens weight capture inline
- Large tap targets throughout (min 48px), iPad-optimized

**Modify `BowlCard.tsx`:**
- When `bowl.status === 'open'`, render `LiveBowlCard` instead
- Sealed/reweighed/discarded bowls keep compact current layout

**Modify `AddProductToBowl.tsx`:**
- Add `inline` prop variant -- always-visible search without cancel button
- After product selection + weight capture, auto-clear for next product (no dismiss)

**New hook: `useAllowanceRemaining(serviceId, sessionId)`:**
- Fetches policy from `service_allowance_policies`
- Sums current bowl line weights from `useMixBowlLines`
- Returns `{ included, used, remaining, pct, status: 'safe' | 'warning' | 'over' }`

### Visual treatment
- Card uses `bg-card/80 backdrop-blur-xl` (existing luxury glass)
- Weight display: `font-display text-4xl tabular-nums` with AnimatedNumber
- Allowance bar: thin progress bar below totals, green/amber/red gradient
- Line items: slide-in animation on add

---

## 2. Checkout Clarity Panel

**Current state:** `useCheckoutUsageCharges` hook exists, `useApproveOverageCharge` and `useWaiveOverageCharge` mutations exist. No UI renders them anywhere.

**Target:** A clear, client-facing explanation panel in `AppointmentDetailSheet` that appears when overage charges exist.

### Changes

**New component: `CheckoutClarityPanel.tsx`**

Renders when `useCheckoutUsageCharges(appointmentId)` returns data:

```
┌────────────────────────────────────────┐
│  Product Usage Summary                 │
│                                        │
│  Full Highlight                        │
│  Included allowance     180 g          │
│  Actual usage           228 g          │
│  ─────────────────────────────         │
│  Additional usage        48 g          │
│                                        │
│  Additional Product     $19.20         │
│  Usage Charge                          │
│                                        │
│  [Approve]          [Waive ▾]          │
│  (manager only)                        │
└────────────────────────────────────────┘
```

- Uses existing `CheckoutUsageCharge` type fields directly
- Approve/Waive buttons only visible to users with admin/manager roles (use existing `useAuth().hasPermission`)
- Waive opens a small dialog requiring reason text (existing `useWaiveOverageCharge` requires `reason`)
- Status badges: pending (amber), approved (green), waived (muted strikethrough)
- Numbers formatted with `BlurredAmount` for cost fields

**Modify `AppointmentDetailSheet.tsx`:**
- Import and render `CheckoutClarityPanel` in the Details tab, below the service info section
- Pass `appointmentId` and `organizationId`
- Only renders if charges exist (component handles empty state internally)

---

## 3. Manager Exception Inbox

**Current state:** `backroom_exceptions` table exists with RLS. `useBackroomExceptions(filters)` and `useResolveException()` hooks exist. No UI component renders them.

**Target:** A standalone inbox component and a badge indicator on the backroom nav.

### Changes

**New component: `BackroomExceptionInbox.tsx`**

Full exception list with filters and resolution actions:

- Filter bar: Status (open/acknowledged/resolved/dismissed), Type, Severity, Date range
- Exception card per item:
  - Icon by type (AlertTriangle for high_waste, Ghost for ghost_loss, Scale for missing_reweigh, TrendingUp for variance_outlier, Package for stockout_risk)
  - Title, description, severity badge (info=blue, warning=amber, critical=red)
  - Staff name + appointment reference (clickable)
  - Metric value vs threshold when available
  - Action buttons: Acknowledge, Resolve (opens notes input), Dismiss
- Empty state: checkmark icon + "No open exceptions"
- Uses existing `useBackroomExceptions` with filter state
- Resolution uses existing `useResolveException` mutation

**New component: `ExceptionResolveDialog.tsx`**
- Small dialog with textarea for notes
- Action selector: resolved vs dismissed
- Calls `useResolveException`

**New component: `ExceptionBadge.tsx`**
- Small count badge showing open exception count
- Uses `useBackroomExceptions({ status: 'open' })` with count only
- Renders as a red dot with number, placed on backroom nav items

**Integration:**
- Add `BackroomExceptionInbox` as a section in the backroom/analytics page or as a dedicated tab
- Add `ExceptionBadge` to the backroom navigation entry point

---

## Implementation Order

1. Build `useAllowanceRemaining` hook
2. Build `LiveBowlCard` component with animated weight display and inline product add
3. Wire `LiveBowlCard` into `BowlCard` for open bowls
4. Build `CheckoutClarityPanel` with approve/waive actions
5. Wire into `AppointmentDetailSheet`
6. Build `BackroomExceptionInbox` + `ExceptionResolveDialog`
7. Build `ExceptionBadge` and wire into nav

