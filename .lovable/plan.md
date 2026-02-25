

## Mass Update: Nested Cards to Use `bg-card-inner`

Good instinct to systematize this. The audit found **12 files** with genuine nested subcard patterns (stat tiles, drilldown panels, info sections inside parent Card components) that should use `bg-card-inner` instead of the inconsistent `bg-muted/30`, `bg-muted/20`, or `bg-muted/30 dark:bg-card` patterns.

### Files and Changes

**1. `src/components/dashboard/AggregateSalesCard.tsx`** (3 remaining instances)
- Line 552: `bg-muted/30 dark:bg-card` → `bg-card-inner` (closed-locations banner)
- Line 570: `bg-muted/30 dark:bg-card` → `bg-card-inner` (hero total revenue section)
- Line 1078: `bg-muted/30 dark:bg-card` → `bg-card-inner` (tips stat tile)

**2. `src/components/dashboard/NewBookingsCard.tsx`** (5 instances)
- Line 91: `bg-muted/30` → `bg-card-inner` (pipeline summary link)
- Line 119: `bg-muted/30` → `bg-card-inner` (new clients tile)
- Line 138: `bg-muted/30` → `bg-card-inner` (returning clients tile)
- Line 157: `bg-muted/30` → `bg-card-inner` (rebook rate section)
- Line 235: `bg-muted/20` → `bg-card-inner` (30-day comparison section)

**3. `src/components/dashboard/sales/ForecastingCard.tsx`** (4 instances)
- Line 362: `bg-muted/20` → `bg-card-inner` (forecast detail panel)
- Line 667: `bg-muted/30` → `bg-card-inner` (revenue stat tile)
- Line 689: `bg-muted/30` → `bg-card-inner` (daily avg stat tile)
- Line 711: `bg-muted/30` → `bg-card-inner` (count stat tile)

**4. `src/components/dashboard/sales/WeekAheadForecast.tsx`** (3 instances)
- Line 354: `bg-muted/30` → `bg-card-inner` (revenue stat tile)
- Line 375: `bg-muted/30` → `bg-card-inner` (daily avg stat tile)
- Line 394: `bg-muted/30` → `bg-card-inner` (count stat tile)

**5. `src/components/dashboard/sales/TipsDrilldownPanel.tsx`** (1 instance)
- Line 339: `bg-muted/30` → `bg-card-inner` (SelfMetricCard component)

**6. `src/components/dashboard/sales/GrowthForecastCard.tsx`** (3 instances)
- Line 277: `bg-muted/20` → `bg-card-inner` (growth detail panel)
- Line 301: `bg-muted/20` → `bg-card-inner` (expansion panel)
- Line 331: `bg-muted/20` → `bg-card-inner` (contraction panel)

**7. `src/components/dashboard/sales/location-comparison/LocationDrilldownPanel.tsx`** (5 instances)
- Lines 187, 200, 215, 228, 258: `bg-muted/20` → `bg-card-inner` (all 5 KPI stat tiles: Team Size, Rev/Provider, Peak Hour, Period Comparison, Retail Attach Rate)

**8. `src/components/dashboard/sales/location-comparison/LocationComparisonCard.tsx`** (2 instances)
- Lines 74-75: `bg-muted/20` and `bg-muted/30` in the ternary → `bg-card-inner` (location card backgrounds for lowest/default states)

**9. `src/components/dashboard/sales/TopPerformersCard.tsx`** (2 instances)
- Line 47: `bg-muted/50 dark:bg-card` → `bg-card-inner` (silver rank background)
- Line 51: `bg-muted/30 dark:bg-card` → `bg-card-inner` (default rank background)

**10. `src/components/dashboard/AnnouncementsBento.tsx`** (2 instances)
- Line 149: `bg-muted/50 dark:bg-card` → `bg-card-inner` (announcement items)
- Line 206: `bg-muted/50 dark:bg-card` → `bg-card-inner` (empty state item)

**11. `src/components/dashboard/analytics/AtRiskClientsList.tsx`** (1 instance)
- Line 88: `bg-muted/30 dark:bg-card` → `bg-card-inner` (client row)

**12. `src/components/dashboard/sales/PeakHoursHeatmap.tsx`** (1 instance)
- Line 167: `bg-muted/30` → `bg-card-inner` (peak time summary)

### What Is NOT Changed

These use `bg-muted/30` for purposes other than nested subcards and should stay as-is:
- **Hover states** (`hover:bg-muted/30`) -- interactive feedback, not subcard background
- **Collapsible triggers** (`KioskSettingsContent.tsx`) -- hover affordance on list items
- **Table row expansions** (`PayrollHistoryTable.tsx`) -- table UI, not a card
- **Image placeholders** (`ProductDetailModal.tsx`, `ProductCard.tsx`) -- image container backgrounds
- **Filter badges** (`AnalyticsFilterBadge.tsx`) -- tiny inline pill, not a subcard
- **Form input containers** (`CategoryAddonManager.tsx`, `SmsTemplateEditor.tsx`) -- form UI
- **Disabled toggle states** (`KioskFeatureToggles.tsx`) -- state indicator, not depth
- **Full-page backgrounds** (`ReviewShareScreen.tsx`) -- page-level background

### Scope

~32 class string replacements across 12 files. All are simple `bg-muted/XX` → `bg-card-inner` swaps (dropping the `dark:bg-card` override where present since the CSS variable handles both modes). No structural changes, no new dependencies.

