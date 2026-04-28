## Why only 8 of 12 cards render

Toggling a card "on" in Customize only writes it to `layout.pinnedCards`. Between that and actual render in `PinnedAnalyticsCard`, there are **four silent suppression layers** that can drop cards without telling the user. With 12 toggled and 8 visible, four are being dropped by one (or a mix) of:

### Suppression sources (in render order)

1. **Financial gate** (`DashboardHome.tsx` line 511)
   `FINANCIAL_PINNED_CARD_IDS` (true_profit, commission_summary, staff_commission_breakdown, service_profitability, staff_performance, etc.) are dropped from `pinnedCardIds` entirely when `useCanViewFinancials()` is false. Owners pass; managers without explicit permission don't.

2. **Stylist privacy contract** (line 884)
   `STYLIST_FORBIDDEN_PINNED_CARDS` are filtered out for stylist-only viewers. Not relevant for an Owner viewing Drop Dead, but is for view-as.

3. **Parent-tab visibility gate** (`PinnedAnalyticsCard.tsx` line 387)
   Each card maps to an analytics tab via `CARD_TO_TAB_MAP` (e.g. `analytics_leadership_tab`, `analytics_sales_tab`). If that tab's `dashboard_element_visibility` row is set to hidden for the user's role, the card returns `null`. This is the most likely culprit for "I toggled it on but nothing appears" — the card is pinned, the tab is hidden.

4. **Per-card self-suppression** (visibility-contracts doctrine)
   - `level_progress_kpi` returns null when `levelCounts.total === 0`
   - `sales_overview` returns null on closed days for "today" range
   - `VisibilityGate` wrapping each card can hide it via per-element visibility key
   - Cards that read empty data ranges may also return null

The user has no signal about which layer dropped the card. The toggle says "on", the card silently vanishes.

## Fix plan

### 1. Diagnose Drop Dead's actual state (read-only)
Query for the org:
- `dashboard_element_visibility` rows for the four analytics tab keys (`analytics_leadership_tab`, `analytics_sales_tab`, `analytics_operations_tab`, `analytics_marketing_tab`) — confirm which are hidden
- The user's role + whether `useCanViewFinancials` evaluates true
- Current `user_preferences.dashboard_layout.pinnedCards` to enumerate the 12

This tells us which of the 4 layers is dropping the missing 4.

### 2. Surface suppression in the Customize menu
Apply the same pattern already used for `payday_countdown` (per the prior fix). In `DashboardCustomizeMenu.tsx`, for each pinned card row show an inline hint when the card is toggled-on but will be silently suppressed:

- "Hidden — Sales analytics tab is off for your role" (parent tab gated)
- "Hidden — financial permissions required" (financial gate)
- "Hidden — no team data yet" (level_progress_kpi empty)
- "Hidden — location is closed today" (sales_overview today-only)

Compute via the same hooks `DashboardHome` uses (`useDashboardVisibility`, `useCanViewFinancials`, `useElementVisibility(parentTabKey)`).

### 3. Emit suppression reasons to the visibility bus
In `PinnedAnalyticsCard.tsx`, every `return null` branch should call the shared `visibility-contract-bus` with a kebab-case reason (`parent-tab-hidden`, `financials-not-permitted`, `no-team-data`, `location-closed`, `unknown-card-id`). Matches the doctrine from `mem://architecture/visibility-contracts.md` and gives dev-mode logging for the next time this happens.

### 4. Auto-unhide the parent tab when a child card is pinned
When a user pins a card whose parent analytics tab is hidden, either:
  - **Option A (recommended):** auto-enable the parent tab visibility for their role (write to `dashboard_element_visibility`) so the toggle does what the user expects.
  - **Option B:** show a confirm prompt: "Pinning this also enables the Sales analytics tab. Continue?"

Pick A by default — toggling on a card should make it appear; that's the contract.

### 5. Contract test
Extend `src/__tests__/dashboard-section-contract.test.ts` (or add a sibling `pinned-card-contract.test.ts`) asserting that for every `PINNABLE_CARD_IDS` entry:
- it has a `CARD_META` entry
- it has a render branch in the compact `switch`
- it has a render branch in the detailed `switch`
- if it has self-suppression, it emits a reason to the bus

This prevents the next "toggle does nothing" regression.

## Files to edit

- `src/components/dashboard/DashboardCustomizeMenu.tsx` — inline suppression hints per pinned card
- `src/components/dashboard/PinnedAnalyticsCard.tsx` — emit suppression reasons on every `return null`
- `src/hooks/useDashboardLayout.ts` (or new helper) — auto-enable parent tab visibility when a child card is pinned
- `src/__tests__/dashboard-section-contract.test.ts` (extend) — pinned-card contract assertions

No DB migrations required — uses existing `dashboard_element_visibility` rows.

## Out of scope

- Restructuring the visibility-tab/card relationship (large refactor; current model is correct, just opaque)
- Removing the financial gate (deliberate permission boundary)
