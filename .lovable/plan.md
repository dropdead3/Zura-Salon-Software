
Prompt review

Good catch. Your prompt was strong because it focused on the real product symptom, not an assumed implementation. A slightly stronger version would be: “These cards show as pinned in Customize Dashboard, but they never render on the org Command Center. Please compare the pinnable card registry against the actual dashboard renderer and find any missing render cases.”

What’s actually happening

These features are not missing product ideas. They are already built, but they are not wired into the renderer the org dashboard actually uses.

I traced the flow:

- `DashboardCustomizeMenu.tsx` lists these as pinnable cards:
  - `commission_summary`
  - `staff_commission_breakdown`
  - plus several others in the same class of issue
- `DashboardHome.tsx` renders pinned dashboard cards through `PinnedAnalyticsCard.tsx`
- `PinnedAnalyticsCard.tsx` does not have render support for:
  - `commission_summary`
  - `staff_commission_breakdown`
  - `true_profit`
  - `service_profitability`
  - `staff_performance`
  - `control_tower`
  - `predictive_inventory`
- Those cards do already exist elsewhere, especially in `CommandCenterAnalytics.tsx`, but that is not the renderer currently driving the org dashboard view you’re looking at

So the pin state is real, but the actual dashboard render path falls through to `default: return null`.

Implementation plan

1. Add missing card render cases in `src/components/dashboard/PinnedAnalyticsCard.tsx`
   - Wire in `CommissionSummaryCard`
   - Wire in `StaffCommissionTable`
   - Also add the other currently pinnable-but-nonrenderable cards so this does not happen again

2. Add compact-mode support for the same cards
   - Extend compact card metadata, labels, descriptions, and links
   - Ensure they appear in both detailed and compact Command Center modes

3. Remove the drift source
   - Refactor toward one shared card registry so “pinnable” and “renderable” come from the same source of truth
   - At minimum, add a guard so a card cannot be exposed in Customize Dashboard unless a renderer exists

4. Verify end-to-end on the org dashboard
   - Confirm the two cards you flagged appear immediately when pinned
   - Confirm the rest of the missing cards render too
   - Check both compact and detailed layouts so we don’t leave a second hidden failure path

Files to update

- `src/components/dashboard/PinnedAnalyticsCard.tsx`
- likely `src/components/dashboard/DashboardCustomizeMenu.tsx` if I centralize the card registry
- possibly `src/components/dashboard/CommandCenterAnalytics.tsx` only if I extract shared config from it

Why the mistake happened

This is an architecture drift bug:
- one file decides what can be pinned
- another file decides what can be rendered
- they are no longer in sync

That is why the UI truthfully says “on,” while the page still shows nothing.
