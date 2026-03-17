

# Revert Backroom Settings to Organization Dashboard Theme

## Problem
All 14 backroom-settings section files were migrated to use `Platform*` components and `--platform-*` CSS variables (the violet/slate admin theme). These are intended for the **platform admin** context only. The Backroom Settings page lives inside the **organization dashboard** (`DashboardLayout`), which uses the standard shadcn/ui theme with `--card`, `--foreground`, `--muted-foreground`, `--border`, etc. — the warm dark aesthetic visible in the Sales Overview screenshot.

## Fix

### 1. Remove platform theme wrapper from `BackroomSettings.tsx`
- Remove `platform-theme platform-dark` class from the three wrapper divs (loading, paywall, main content)
- Replace `PlatformPageHeader` with a standard heading using `tokens.card.title` / design token patterns
- Revert sidebar nav and mobile selector from `--platform-*` variables to standard `bg-muted`, `text-foreground`, `text-muted-foreground`, `border` classes

### 2. Revert all 14 section files — component swap

Every file in `src/components/dashboard/backroom-settings/` needs:

**Import replacements:**
| Platform Import | Standard Import |
|---|---|
| `PlatformCard, PlatformCardContent, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription` | `Card, CardContent, CardHeader, CardTitle, CardDescription` from `@/components/ui/card` |
| `PlatformButton` | `Button` from `@/components/ui/button` |
| `PlatformBadge` | `Badge` from `@/components/ui/badge` |
| `PlatformInput` | `Input` from `@/components/ui/input` |
| `PlatformTable, PlatformTableHeader, PlatformTableBody, PlatformTableHead, PlatformTableRow, PlatformTableCell` | `Table, TableHeader, TableBody, TableHead, TableRow, TableCell` from `@/components/ui/table` |
| `PlatformSelectTrigger, PlatformSelectContent, PlatformSelectItem` | `SelectTrigger, SelectContent, SelectItem` from `@/components/ui/select` |

**CSS variable replacements:**
| Platform Variable | Standard Equivalent |
|---|---|
| `hsl(var(--platform-foreground))` | `text-foreground` or `text-card-foreground` |
| `hsl(var(--platform-foreground-muted))` | `text-muted-foreground` |
| `hsl(var(--platform-bg-card)/0.5)` | `bg-card/80` or `bg-muted/30` |
| `hsl(var(--platform-bg-elevated))` | `bg-card` |
| `hsl(var(--platform-border)/0.5)` | `border` (standard Tailwind) |
| `hsl(var(--platform-accent))` / `hsl(var(--platform-primary))` | `bg-primary` / `text-primary` |
| `hsl(var(--platform-bg-hover))` | `bg-accent` / `hover:bg-muted` |
| `hsl(var(--platform-input))` | standard `Input` styling (no override needed) |

### 3. Files to edit (14 section files + 1 page file)

1. `BackroomSettings.tsx` — remove platform wrapper, revert nav styling
2. `BackroomSetupOverview.tsx` — Card/Button/Badge swap + CSS vars
3. `BackroomProductCatalogSection.tsx` — Card/Button/Badge/Input/Table/Select/BrowseColumn swap + CSS vars (largest file ~1245 lines)
4. `ServiceTrackingSection.tsx` — Card/Button/Badge swap + CSS vars
5. `RecipeBaselineSection.tsx` — Card/Button/Badge/Input swap + CSS vars
6. `AllowancesBillingSection.tsx` — Card/Button/Badge/Input swap + CSS vars
7. `StationsHardwareSection.tsx` — Card/Button/Badge swap + CSS vars
8. `InventoryReplenishmentSection.tsx` — Card/Button/Input/Table swap + CSS vars
9. `BackroomPermissionsSection.tsx` — Card/Button swap + CSS vars
10. `AlertsExceptionsSection.tsx` — Card/Button/Input swap + CSS vars
11. `FormulaAssistanceSection.tsx` — Card/Button swap + CSS vars
12. `BackroomComplianceSection.tsx` — Card/Button/Badge/Table swap + CSS vars
13. `BackroomInsightsSection.tsx` — Card/Button/Table swap + CSS vars
14. `MultiLocationSection.tsx` — Card/Button/Badge swap + CSS vars
15. `BackroomROICard.tsx` — Card swap + CSS vars

### 4. What stays the same
- All business logic, mutations, queries, state management untouched
- The `BrowseColumn` component from platform is still used in the Product Catalog (it's a structural layout component, not themed)
- `useSupplyBrandsMeta`, `groupByProductLine`, `extractProductLine` imports stay
- `Infotainer`, `MetricInfoTooltip`, `Switch`, `Progress`, `ScrollArea` etc. are standard components and stay
- The `tokens` design token references (`tokens.card.title`, `tokens.body.emphasis`, etc.) stay — these are theme-agnostic

### Execution order
This is a large mechanical refactor across 15 files. I'll process them in batches, starting with the page-level wrapper (`BackroomSettings.tsx`), then the section files alphabetically.

