## Problem

Three widgets currently have a footer "View All / Manage" CTA:

- What's New → updates page
- Day Rate → day rate calendar
- Help Center → help center
- My Work Days → profile

But four widgets have no CTA, leaving the user stranded:

- **Team Birthdays** — no way to navigate to the celebrations page
- **Work Anniversaries** — same problem
- **AI Suggested Tasks** — no way to drill into the tasks/briefing surface

## Destination map (verified against `src/App.tsx`)

| Widget | Destination | Route | CTA copy |
|---|---|---|---|
| Team Birthdays | TeamBirthdays page (covers birthdays + anniversaries — confirmed via `rg "Anniversary"` in that page) | `/admin/birthdays` | View All |
| Work Anniversaries | Same TeamBirthdays page | `/admin/birthdays` | View All |
| AI Suggested Tasks | No standalone tasks route exists. AI tasks live in the dashboard's daily briefing. | n/a | **No CTA** — keep widget footerless. The user already sees them in the briefing on the same page. |
| My Work Days | Profile (already wired) | `/profile` | Manage (already there) |
| What's New | Updates dialog (already wired) | n/a | View All Updates (already there) |
| Day Rate | Day rate calendar (already wired) | `/admin/day-rate-calendar` | View All (already there) |
| Help Center | Help (already wired) | n/a | Browse Help Center (already there) |

## Footer pattern (already established by existing widgets)

```tsx
<div className="flex justify-end mt-2 pt-2 border-t border-border/40 min-h-[28px]">
  <Link
    to={dashPath('/admin/birthdays')}
    className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
  >
    View All <ChevronRight className="w-3 h-3" />
  </Link>
</div>
```

This matches the footer already used by HelpCenterWidget, DayRateWidget, ChangelogWidget, and WorkScheduleWidgetCompact — same border, same spacing, same transition.

## Implementation

### File 1: `src/components/dashboard/BirthdayWidget.tsx`

1. Add imports: `Link` from `react-router-dom`, `ChevronRight` (extend the existing `lucide-react` import line), and `useOrgDashboardPath` from `@/hooks/useOrgDashboardPath`.
2. Inside `BirthdayWidget()`, add `const { dashPath } = useOrgDashboardPath();`.
3. Append the standard footer block (above) inside the `<Card>` immediately before its closing tag, in the main return path. Use copy: `View All`, route: `/admin/birthdays`.
4. The loading skeleton stays unchanged.

### File 2: `src/components/dashboard/AnniversaryWidget.tsx`

Same three changes as BirthdayWidget. Footer routes to the same page (`/admin/birthdays`) since that page already covers anniversaries (verified — it uses anniversary hooks and shows "Work anniversaries are to celebrate the length of time…").

### File 3: AI Tasks widget — intentionally skipped

`AITasksWidget` doesn't get a CTA. There's no dedicated `/tasks` route, and the AI tasks are already surfaced in the dashboard's daily briefing panel on the same page. Adding a CTA that scrolls within the same page would be noise. Per the visibility/doctrine rule, silence is valid output.

If the user wants this changed — e.g. add a "Manage" link that opens a tasks drawer — that's a separate ask and I'd need to know the desired destination.

### Files NOT touched

- `WorkScheduleWidgetCompact.tsx` — already has correct "Manage → /profile" CTA
- `ChangelogWidget.tsx` — already has "View All Updates" trigger
- `DayRateWidget.tsx` — already routes to `/admin/day-rate-calendar`
- `HelpCenterWidget.tsx` — already routes to help center
- The 220–320px height contract stays intact since the new footer fits inside the band (existing footers already do).

## Notes

- Both new footers use `Link` (client-side routing), satisfying the Core memory rule that prohibits `window.location.href`.
- `dashPath('/admin/birthdays')` resolves to the multi-tenant URL hierarchy (`/org/<slug>/dashboard/admin/birthdays`).
- `/admin/birthdays` is gated by the `view_team_overview` permission (line 357 of `App.tsx`). Stylists without that permission may see a permission denial when clicking. **This is correct behavior under the Stylist Privacy Contract** (peer rosters are forbidden for stylists). If you want stylists to see birthdays too, that's a permissions decision outside this widget change.

## Files to edit

- `src/components/dashboard/BirthdayWidget.tsx` — add footer with `View All → /admin/birthdays`
- `src/components/dashboard/AnniversaryWidget.tsx` — add footer with `View All → /admin/birthdays`

## Prompt feedback

Clear directional ask — you named the missing surfaces ("team birthdays, work anniversaries, profile settings") and the structural pattern ("appropriate buttons to go to the area"). That gave me enough to verify destinations against the actual route table rather than guess.

One refinement: when destinations differ from widget names (anniversaries → /admin/birthdays page is non-obvious), spelling out "or just route both to wherever the team celebration page lives" would have shortcut my route audit. As-is, I had to confirm that page covers anniversaries before committing.

## Enhancement suggestions

1. **Codify a "widget CTA contract."** Add a brief authoring rule: every widget either (a) has a footer Link to its drill-down surface, or (b) has none if the data is already surfaced elsewhere on the same page. The current 7 widgets satisfy this once these two CTAs land. Worth memoializing so future widgets don't re-invent.
2. **Address the AI Tasks gap properly.** If you do want a separate tasks-management surface (vs. the inline briefing), that's a real gap — there's no `/admin/tasks` route. Could be its own follow-up: build a Tasks page and link the widget to it.
3. **Permission-aware CTAs.** A future enhancement: hide the footer Link entirely when the user lacks the destination's permission (e.g. stylists viewing the birthdays widget). That avoids the "click → access denied" dead-end. Easy add via `useUserPermissions().has('view_team_overview')` guard around the footer render.
