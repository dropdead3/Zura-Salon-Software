

## Prompt review

Good pivot — you correctly recognized that hiding the tab entirely loses a discovery/growth opportunity. Showing a locked tab with an upsell turns every unentitled appointment view into a passive marketing surface for Color Bar. This matches the platform's growth doctrine (Apps marketplace + entitlement gates with upsell paths).

Tighter framing for next time: clarify the upsell *destination* — should the CTA route to (a) the Zura Apps marketplace (`/dashboard/apps`), (b) a "Contact Sales" action like Connect/Payroll gates, or (c) a Color Bar product detail page? I'll propose routing to the Apps marketplace since Color Bar is a self-serve activation per the entitlement governance canon (unlike Connect/Payroll which require sales contact). Flag if you want different.

## Plan

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

1. **Keep the Color Bar tab visible for everyone.** Do not gate the `TabsTrigger`. The tab remains in the strip for all orgs (5 tabs total).

2. **Gate the *content*, not the tab.** Inside `<TabsContent value="color-bar">`, branch on `colorBarEntitled`:
   - **Entitled** → render the existing nested sub-tabs (Today's Mix + Formula History) unchanged.
   - **Not entitled** → render a new `<ColorBarUpsell>` inline component (calm, advisory, in-panel — not a modal).

3. **Add entitlement hook** near other hooks (~line 670):
   ```tsx
   const { isEntitled: colorBarEntitled, isPendingActivation } = 
     useColorBarEntitlement(appointment.location_id ?? undefined);
   ```
   Import: `useColorBarEntitlement` from `@/hooks/color-bar/useColorBarEntitlement`.

4. **Create the inline upsell** (new lightweight component or inline JSX inside the TabsContent block). Structure mirrors the executive tone of `ConnectSubscriptionGate` but compact for in-panel use:
   - **Icon block**: `Beaker` in a tinted square (`bg-primary/10`, `rounded-xl`)
   - **Header**: "Zura Color Bar" (`font-display text-base tracking-wide`)
   - **Body** (advisory-first, brand-voice compliant):
     > "Engineered chemical service infrastructure. Track formulas, manage stock at the location level, and propagate chemical costs into checkout — all from inside every appointment."
   - **Three compact feature lines** (icon + label):
     - Formula history per client
     - Per-location stock and cost tracking
     - Dock-to-checkout chemical cost propagation
   - **Primary CTA**: "Activate Zura Color Bar" → `navigate(dashPath('/dashboard/apps'))` (uses existing `dashPath` helper already in the file)
   - **If `isPendingActivation`** (org flag on, but no location entitled): swap CTA copy to "Activate for this location" and route to color-bar settings instead. Calm hint: "Color Bar is enabled for your organization. Activate it for this location to begin."

5. **No state-reset effect needed** — the tab is always present; no `activeTab` fallback required.

6. **No DB / RLS / hook changes.**

## Acceptance checks

1. All orgs see 5 tabs including Color Bar (with Beaker icon). No tab hidden.
2. Entitled orgs (org flag ON + location entitled) see the existing Today's Mix / Formula History sub-tabs, unchanged behavior.
3. Unentitled orgs see the inline upsell card inside the Color Bar tab — no sub-tabs, no empty data fetches.
4. CTA "Activate Zura Color Bar" routes to `/dashboard/apps` via `dashPath` (preserves multi-tenant URL).
5. `isPendingActivation` state (org enabled, location not yet activated) shows the per-location activation variant routing to color-bar settings.
6. Upsell copy is brand-voice compliant: no hype, no emojis, no "revolutionary," advisory tone.
7. Upsell layout fits inside the 520px panel cleanly, mobile and desktop.
8. No data fetches fire from `ColorBarTab` / `ClientFormulaHistoryTab` for unentitled orgs (they aren't mounted).
9. Dark mode + light mode both render correctly.
10. No regression to the other 4 tabs.

**Files to modify:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (add entitlement hook; conditional content branch with inline upsell + CTA routing)

