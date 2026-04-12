

# Add Tooltips to Capital Settings

## What

Add `MetricInfoTooltip` next to every label on the Capital Settings page so each field has a clear, contextual explanation of what it controls and why it matters.

## Tooltip Content

**Eligibility Thresholds**
- **Min ROE Score** — "Return on Expansion score. Opportunities below this threshold won't surface. Higher values mean only the most efficient growth levers appear. Default: 1.8"
- **Min Confidence Score** — "How confident the system must be in the opportunity before showing it. Scale of 0–100. Lower values surface more opportunities but with less certainty. Default: 70"
- **Max Risk Level** — "The highest risk tier allowed for surfaced opportunities. 'Low' is most conservative, 'High' allows riskier bets with higher potential upside."
- **Max Concurrent Projects** — "Limits how many funded projects can be active at once per organization. Prevents overextension during growth phases."

**Cooldowns & Suppression**
- **Cooldown After Decline (days)** — "After an opportunity is declined, it won't resurface for this many days. Prevents alert fatigue from repeated suggestions."
- **Cooldown After Underperformance (days)** — "If a funded project underperforms, new opportunities are suppressed for this period. Protects against compounding poor investments."

**Access Policies**
- **Allow Manager Initiation** — "When enabled, managers can submit capital funding requests for their location without requiring admin approval first."
- **Allow Stylist Micro-Funding** — "When enabled, stylists who meet the SPI and ORS thresholds below can access personal growth funding (e.g. education, chair expansion)."
- **Stylist SPI Threshold** — "Minimum Stylist Performance Index required. Measures revenue, retention, and productivity. Scale of 0–100."
- **Stylist ORS Threshold** — "Minimum Ownership Readiness Score required. Measures leadership, consistency, and operational maturity. Scale of 0–100."

## Implementation

**File**: `src/pages/dashboard/admin/CapitalSettings.tsx`

- Import `MetricInfoTooltip` from `@/components/ui/MetricInfoTooltip`
- Place a `<MetricInfoTooltip>` inline next to each `<Label>` inside a `flex items-center gap-1.5` wrapper
- For switch rows, place the tooltip after the label text in the same flex row

One file, no new components needed.

