

## Gap Analysis: Missing Analytics & Widgets in Dashboard Customizer

### Findings

The customizer's `PINNABLE_CARDS` list has **12 cards**, but `CommandCenterAnalytics.renderCard()` supports **25 card types**. That means **13 analytics cards are renderable on the dashboard but completely invisible in the customizer** — users cannot discover, pin, reorder, or toggle them.

Additionally, `operations_stats` exists in the customizer but has no matching `renderCard` case — it appears to be a stale entry that should map to `operational_health`.

### Missing Cards (13 total)

| Card ID | Label | Suggested Category |
|---|---|---|
| `executive_summary` | Executive Summary | Executive |
| `daily_brief` | Daily Brief | Executive |
| `client_health` | Client Health | Clients |
| `operational_health` | Operational Health | Operations |
| `rebooking` | Rebooking Rate | Clients |
| `locations_rollup` | Locations Rollup | Operations |
| `service_mix` | Service Mix | Sales |
| `retail_effectiveness` | Retail Effectiveness | Sales |
| `commission_summary` | Commission Summary | Financial |
| `staff_commission_breakdown` | Staff Commission Breakdown | Financial |
| `true_profit` | True Profit | Financial |
| `staff_performance` | Staff Performance | Staffing |
| `service_profitability` | Service Profitability | Financial |
| `control_tower` | Color Bar Control Tower | Backroom |
| `predictive_inventory` | Predictive Inventory | Backroom |

### Stale Entry

- `operations_stats` in PINNABLE_CARDS has no renderCard case — replace with `operational_health`

### Changes Required

**1. Update `PINNABLE_CARDS` in `DashboardCustomizeMenu.tsx`**
- Remove stale `operations_stats` entry
- Add all 15 missing card definitions with appropriate icons, categories, and size overrides
- New categories: `Executive`, `Financial`, `Backroom` (joining existing Sales, Forecasting, Clients, Operations, Staffing)

**2. Update `CARD_SIZE_OVERRIDES` map**
- Already has some of these (executive_summary: full, service_mix: half, etc.) — verify all new entries have correct sizes

**3. Create preview components for new cards**
- Add 15 new preview mini-components to `AnalyticsCardPreview.tsx`
- Each follows the existing pattern: `MiniHeader` + hardcoded faux data rows
- Executive Summary: KPI strip with revenue/margin/retention
- Daily Brief: Today's highlights list
- Client Health: Retention gauge + at-risk count
- Operational Health: Utilization + cancellation stats
- Rebooking: Rate gauge + trend
- Locations Rollup: Location comparison bars
- Service Mix: Category donut
- Retail Effectiveness: Attach rate + top products
- Commission Summary: Total payout + tier breakdown
- Staff Commission Breakdown: Staff table rows
- True Profit: Revenue - costs waterfall
- Staff Performance: Ranked performance bars
- Service Profitability: Service margin rows
- Control Tower: Status indicators
- Predictive Inventory: Reorder alerts

**4. Update `renderCard` default order**
- Ensure `DEFAULT_PINNED_CARDS` or similar default lists include the new cards appropriately (likely not pinned by default — they appear in Available Analytics)

### Technical Details

- The `CARD_SIZE_OVERRIDES` map already defines sizes for several of these cards (executive_summary: full, service_mix: half, etc.) — those remain untouched
- Category grouping in the Available Analytics section will automatically organize new cards under their categories
- Preview components follow the existing `MiniHeader` + `StatRow` pattern, ~30-40 lines each
- Total new preview code: ~500 lines added to `AnalyticsCardPreview.tsx`
- No database changes needed — this is purely a UI registration gap

