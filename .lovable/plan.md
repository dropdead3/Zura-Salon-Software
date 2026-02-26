

## Add Today's Prep as a Default Stylist Dashboard Section

### What This Does
Adds a "Today's Prep" card directly on the Command Center dashboard for stylists, showing a compact preview of their upcoming appointments with client context (visit count, CLV tier, last service). This eliminates the need to navigate to a separate page for quick pre-appointment awareness.

### Changes Required

**1. Dashboard Section Definition** — `src/components/dashboard/DashboardCustomizeMenu.tsx`
- Add a new section entry `todays_prep` with `ClipboardCheck` icon, description "Pre-visit client prep", and `isVisible: (ctx) => ctx.hasStylistRole`
- Place it after `quick_stats` in the sections list (natural flow: stats → prep → schedule)

**2. Default Layout Updates** — `src/hooks/useDashboardLayout.ts`
- Add `'todays_prep'` to `DEFAULT_LAYOUT.sections` and `DEFAULT_LAYOUT.sectionOrder` (after `quick_stats`)
- Add migration logic: if existing layout doesn't include `todays_prep`, splice it in after `quick_stats` (so existing users get it automatically)

**3. Stylist Template Update** — Database migration
- Update the `dashboard_layout_templates` row for `role_name = 'stylist'` to include `todays_prep` in its sections array (after `quick_actions`)

**4. Compact Prep Component** — New: `src/components/dashboard/TodaysPrepSection.tsx`
- A compact card that reuses the existing `useTodayPrep` hook
- Shows a summary list of today's appointments: time, client name, CLV tier badge, visit count, last service
- "View Full Prep" link at the bottom navigates to `/dashboard/today-prep`
- Wrapped in `VisibilityGate` with `elementKey="todays_prep"`
- Styled consistently with other dashboard sections (Card with rounded-xl, font-display header)

**5. Dashboard Rendering** — `src/pages/dashboard/DashboardHome.tsx`
- Add `todays_prep` entry to the section renderer map
- Conditionally render only for stylist roles (`hasStylistRole`)
- Import and render `TodaysPrepSection`

### Layout Preview (Stylist Dashboard)

```text
┌─────────────────────────────────┐
│ Quick Actions                   │
├─────────────────────────────────┤
│ Quick Stats (4 tiles)           │
├─────────────────────────────────┤
│ Today's Prep  ← NEW            │
│  9:00  Jane D.  Gold · 12 visits│
│ 10:30  Mark T.  Silver · 4 vis  │
│ 11:00  Sarah K. Bronze · 2 vis  │
│        View Full Prep →         │
├─────────────────────────────────┤
│ Schedule & Tasks                │
├─────────────────────────────────┤
│ Client Engine                   │
└─────────────────────────────────┘
```

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/TodaysPrepSection.tsx` | Create — compact prep card component |
| `src/components/dashboard/DashboardCustomizeMenu.tsx` | Edit — add `todays_prep` section config |
| `src/hooks/useDashboardLayout.ts` | Edit — add to defaults + migration |
| `src/pages/dashboard/DashboardHome.tsx` | Edit — render `todays_prep` section |
| Database migration | Update stylist template to include `todays_prep` |

