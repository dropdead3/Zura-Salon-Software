

# Revamp Org-Level Backroom to Platform Styling

## What Changes

The Backroom Settings page and all its section components currently use dashboard-level shadcn/ui primitives (`Card`, `Badge`, `Button`, `Input`, `Select`, `Table`, `Dialog`). These will be swapped to their `Platform*` counterparts to match the Supply Library / Brand Catalog aesthetic.

## Approach: Incremental (3 phases)

### Phase 1 — Shell + Product Catalog (this pass)
**Files:** `BackroomSettings.tsx`, `BackroomProductCatalogSection.tsx`

- **BackroomSettings.tsx**: Keep `DashboardLayout` wrapper (needed for org context, sidebar, top bar). Internally:
  - Replace `DashboardPageHeader` with `PlatformPageHeader`
  - Restyle the sidebar nav to use `--platform-*` CSS variables (bg, border, text colors matching the Supply Library sidebar)
  - Mobile selector uses platform input styling
- **BackroomProductCatalogSection.tsx** (~1360 lines): Swap all imports:
  - `Card` → `PlatformCard`, `CardHeader` → `PlatformCardHeader`, etc.
  - `Badge` → `PlatformBadge`
  - `Button` → `PlatformButton`
  - `Input` → `PlatformInput`
  - `Select` → Platform Select components
  - `Table` → `PlatformTable` components
  - Replace `tokens.card.*` / `tokens.kpi.*` with `tokens.platformKpi.*` and platform card styling
  - `Infotainer` stays but gets platform-compatible color overrides

### Phase 2 — Core Sections
**Files:** `BackroomSetupOverview.tsx`, `ServiceTrackingSection.tsx`, `RecipeBaselineSection.tsx`, `AllowancesBillingSection.tsx`

Same component swap pattern as Phase 1.

### Phase 3 — Remaining Sections
**Files:** `StationsHardwareSection.tsx`, `InventoryReplenishmentSection.tsx`, `BackroomPermissionsSection.tsx`, `AlertsExceptionsSection.tsx`, `FormulaAssistanceSection.tsx`, `BackroomComplianceSection.tsx`, `MultiLocationSection.tsx`, `BackroomInsightsSection.tsx`, `SupplyIntelligenceDashboard.tsx`

Same pattern. Also migrate any sub-dialogs (`SupplyLibraryDialog.tsx`, `BackroomBulkPricingDialog.tsx`, etc.).

## Technical Details

- **Import swap pattern** (repeated across all files):
  ```
  - import { Card, ... } from '@/components/ui/card'
  + import { PlatformCard, ... } from '@/components/platform/ui/PlatformCard'
  - import { Button } from '@/components/ui/button'
  + import { PlatformButton } from '@/components/platform/ui/PlatformButton'
  ```
  (Same for Badge, Input, Select, Table, Dialog, Label)

- **Token updates**: `tokens.kpi.*` → `tokens.platformKpi.*` for KPI tiles; `tokens.card.iconBox` colors adjusted to platform variables

- **Sidebar styling**: Current uses `bg-muted`, `text-foreground` — will switch to `bg-[hsl(var(--platform-bg-card))]`, `text-[hsl(var(--platform-foreground))]` etc.

- **No layout/logic changes** — purely a visual component swap. All hooks, mutations, state management untouched.

## What Stays the Same
- `DashboardLayout` outer wrapper (provides org context, top bar, sidebar)
- All business logic, hooks, data fetching
- Component structure and hierarchy
- `Infotainer` component (already theme-adaptive)

