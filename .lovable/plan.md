

## Move Revenue-by-Category Drilldown from Total Revenue to Services Card

**What's changing:** Currently clicking the big total revenue number opens the "Revenue by Category" panel below. This is unintuitive — that panel shows service category breakdowns, so it should be triggered from the Services card instead.

### Changes — `src/components/dashboard/AggregateSalesCard.tsx`

**1. Remove click-to-drilldown from Total Revenue hero (lines ~754–761, ~982–988)**
- Remove `onClick={() => toggleDrilldown('revenue')}` and `cursor-pointer` from the hero div
- Remove the `group/revenue` class and the active ring/bg styling tied to `activeDrilldown === 'revenue'`
- Remove the bottom chevron indicator that shows on hover/active

**2. Move the drilldown trigger to the Services card click (line ~1021–1023)**
- Change `onClick={() => setDrilldownMode('services')}` → `onClick={() => toggleDrilldown('revenue')}`
- This makes clicking the Services total number open the Revenue by Category panel instead of the old ServiceProductDrilldown dialog
- Add visual feedback: active ring styling when `activeDrilldown === 'revenue'`

**3. RevenueByCategoryPanel stays where it is (line ~1148)**
- It already renders based on `activeDrilldown === 'revenue'` — no change needed there

**4. Optionally keep the ServiceProductDrilldown accessible**
- The "Breakdown" toggle already exists on the services card for the inline category list — the services drilldown dialog can be triggered from there or removed if redundant

This is a straightforward rewiring of click handlers within the same file.

