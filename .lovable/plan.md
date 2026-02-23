

## Two Changes: Rename Appointments Page + Enhance Audit Log Page

### 1. Rename "Appointments & Transactions" to "Appointments"

Update the page title and all navigation references:

- **`src/pages/dashboard/AppointmentsHub.tsx`** (line 296): Change `DashboardPageHeader title` from "Appointments & Transactions" to "Appointments"
- **`src/config/dashboardNav.ts`** (lines 113, 145): Change both nav labels from "Appointments & Transactions" to "Appointments"

The route path (`/dashboard/appointments-hub`) stays the same to avoid breaking bookmarks or the existing redirect on line 333 of App.tsx.

---

### 2. Enhance the Platform Audit Log Page

The existing page at `src/pages/dashboard/platform/AuditLog.tsx` has hardcoded `slate-*` color classes throughout (dark-mode-only styling that won't adapt to theme changes). This refactor brings it in line with the design token system and improves usability.

**Styling overhaul:**
- Replace all `bg-slate-800/40`, `border-slate-700/50`, `text-slate-400`, etc. with semantic tokens (`bg-muted/50`, `border-border/60`, `text-muted-foreground`, `text-foreground`)
- Filter bar: apply `tokens.input.filter` to all `SelectTrigger` components, remove hardcoded widths, use `w-auto`
- Search input: apply `tokens.input.search` class
- Table headers: use `tokens.table.columnHeader` (Title Case, font-sans)
- Badge colors: use theme-aware classes (`bg-violet-500/20 text-violet-400` becomes semantic or kept as accent colors but with proper dark/light support)
- Detail Sheet: replace `bg-slate-900`, `text-white` with `bg-card`, `text-foreground`

**Page header update:**
- Rename title from "Audit Log Explorer" to "Activity Log" for approachability
- Update sidebar nav label in `src/config/platformNav.ts` from "Audit Log" to "Activity Log"

**Files changed:**
- `src/pages/dashboard/platform/AuditLog.tsx` -- full styling refactor to semantic tokens
- `src/config/platformNav.ts` -- rename "Audit Log" label to "Activity Log"
- `src/pages/dashboard/AppointmentsHub.tsx` -- rename title
- `src/config/dashboardNav.ts` -- rename nav labels

