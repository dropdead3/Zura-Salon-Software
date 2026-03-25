

## Container Types for Services (Bowl vs Bottle)

### Problem
All formulations are labeled "Bowl" regardless of the actual vessel. Toner services use bottles, not bowls. Some services (e.g., Full Balayage) require both bowls and bottles.

### Phase 1 — Core Implementation

**1. Database Migration**
- Create `container_type` enum: `'bowl'`, `'bottle'`
- Add `container_types container_type[] NOT NULL DEFAULT '{bowl}'` to `public.services`
- Add `container_type container_type NOT NULL DEFAULT 'bowl'` to `public.mix_bowls`

Both default to `bowl` so all existing data remains correct.

**2. Service Editor — Container Type Setting**
`src/components/dashboard/settings/ServiceEditorDialog.tsx`
- Add a "Container Types" multi-select (checkboxes for Bowl / Bottle) in the Details tab, below the existing toggles
- Persist via the existing `onSubmit` flow — add `container_types` to the `Service` interface in `useServicesData.ts`

**3. Service Lookup — Expose Container Types**
`src/hooks/useServiceLookup.ts`
- Add `container_types` to `ServiceLookupEntry` and the select query
- The Dock formulations tab already uses this lookup to resolve service metadata

**4. Dock Formulations Tab — Dynamic Labels & Buttons**
`src/components/dock/appointment/DockServicesTab.tsx`
- Resolve `container_types` from the service lookup for each service section
- If service allows only bottles → show "Add Bottle" instead of "Add Bowl"
- If service allows both → show "Add Bowl" and "Add Bottle" buttons
- `BowlCard`: display "Bowl {n}" or "Bottle {n}" based on `session.container_type` (fetched from mix_bowls via a new field on `DockMixSession`)
- `AddBowlCard`: accept a `containerLabel` prop for the button text
- Section header: show "N bowl(s)" / "N bottle(s)" / "N formulation(s)" dynamically

**5. Bowl Creation — Persist Container Type**
`src/hooks/dock/useDockMixSession.ts` — `useCreateDockBowl`
- Accept `containerType` param, set `bowl_name` to `'Bowl 1'` or `'Bottle 1'` accordingly
- Insert `container_type` into `mix_bowls`

`src/hooks/backroom/useMixBowls.ts` — `useCreateMixBowl`
- Same: accept and persist `container_type`

**6. New Bowl Sheet**
`src/components/dock/mixing/DockNewBowlSheet.tsx`
- Accept `containerType` prop, update header to "New Bowl" or "New Bottle"

**7. Bowl Action Sheet & Rename Dialog**
- `DockBowlActionSheet.tsx`: accept `containerLabel` to show "Edit Bowl" vs "Edit Bottle" etc.
- `DockRenameBowlDialog.tsx`: dynamic title "Rename Bowl" / "Rename Bottle"

**8. Demo Data**
`src/hooks/dock/dockDemoData.ts`
- Add `container_type` to demo mix sessions and demo bowls

### Phase 2 — Follow-ups (after core)

1. **Seed known toner services**: One-time data update to set `container_types = '{bottle}'` for services with names containing "Toner", "Gloss", etc.
2. **Dashboard MixSessionManager**: Update admin-side bowl labels to respect container type
3. **Formula History**: Show container type on `DockFormulaHistorySheet` cards
4. **Icon differentiation**: Use `TestTube2` for bottles vs `FlaskConical` for bowls on cards
5. **Reporting labels**: Check `useBackroomAnalytics` and related hooks for user-facing "bowl" text

### Files (Phase 1)
- **Migration SQL** — new enum + two ALTER TABLE statements
- `src/hooks/useServicesData.ts` — add `container_types` to `Service` interface
- `src/hooks/useServiceLookup.ts` — add `container_types` to lookup
- `src/components/dashboard/settings/ServiceEditorDialog.tsx` — container type checkboxes
- `src/components/dock/appointment/DockServicesTab.tsx` — dynamic labels, buttons, card text
- `src/hooks/dock/useDockMixSession.ts` — accept + persist container type
- `src/hooks/dock/useDockMixSessions.ts` — expose container_type from mix_bowls
- `src/hooks/backroom/useMixBowls.ts` — accept + persist container type
- `src/components/dock/mixing/DockNewBowlSheet.tsx` — dynamic header
- `src/components/dock/mixing/DockBowlActionSheet.tsx` — dynamic action labels
- `src/components/dock/mixing/DockRenameBowlDialog.tsx` — dynamic title
- `src/hooks/dock/dockDemoData.ts` — demo data updates

