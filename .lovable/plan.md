

# Add "How to Find This Number" Tips to Economics Fields

## What Changes

Add practical, actionable guidance to each economics field telling salon owners exactly where to find the real number and how to calculate it. This applies to both the **smart setup card** (first visit) and the **returning-user assumptions panel**.

## Implementation

### Single change: Expand `FIELDS` config in `EconomicsSmartDefaults.tsx` and tooltip text in `CommissionEconomicsTab.tsx`

Each field gets a new `howToFind` string added to the `FieldConfig` interface. This renders as a collapsible "How to find this" section under each field in both the smart defaults card and the assumptions panel.

**Overhead / Stylist**
> *Pull your monthly P&L or accounting software. Add up: rent, utilities, insurance, supplies, front desk payroll, software subscriptions, and any other fixed costs. Divide that total by your number of stylists. Example: $19,000 total fixed costs ÷ 5 stylists = $3,800/stylist.*

**Product Cost %**
> *From your P&L, find "Cost of Goods Sold" or "Chemical/Backbar" expense. Divide by your total service revenue (not including retail). Example: $4,500 in chemicals ÷ $40,000 service revenue = 11.3%. If you use a distributor, check your monthly invoices for a faster number.*

**Target Margin %**
> *Look at your P&L bottom line: Net Income ÷ Total Revenue = your current margin. If you're at 8%, setting a target of 12% gives you a goal to work toward. Most healthy salons target 10–15% net margin.*

**Hours / Month**
> *Check your booking software for average booked hours per stylist. Or calculate: days worked per week × hours per day × 4.3 weeks. Example: 5 days × 8 hours × 4.3 = 172 hrs/mo. Part-time stylists will be lower — use their actual schedule.*

### Where tips appear

1. **Smart setup card** (`EconomicsSmartDefaults.tsx`): Below each field description in the non-adjusting view, add a small "How to find this →" link that expands the tip inline.
2. **Assumptions panel** (`CommissionEconomicsTab.tsx`): Replace the current static description text (e.g., "Rent, utilities, insurance per stylist") with the expanded how-to-find guidance, shown as a subtle expandable section under the benchmark text.

### Technical details

- Add `howToFind` field to the `FieldConfig` interface in `EconomicsSmartDefaults.tsx`
- Use a `Collapsible` component (already imported in the file's parent) or a simple `useState` toggle per field to show/hide the tip
- Style: `text-[11px] text-muted-foreground/70 leading-relaxed` with a `HelpCircle` icon trigger
- Update `MetricInfoTooltip` descriptions in `CommissionEconomicsTab.tsx` to include the P&L guidance alongside the existing definition

### Files changed

| File | Change |
|---|---|
| `src/components/dashboard/settings/EconomicsSmartDefaults.tsx` | Add `howToFind` to `FieldConfig`, render expandable tip under each field |
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | Update tooltip descriptions to include P&L calculation guidance |

