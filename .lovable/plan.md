

# Zura Dock — User-Facing Mixing App Build Plan

## What We're Building

A standalone, mobile-first (iPad-optimized) app experience at `/dock` — the stylist-facing mixing station. This mirrors the Vish app's UX patterns analyzed across all 26 screenshots, wired to the existing Zura Backroom engine.

## Complete Feature Map (from Vish Analysis)

```text
┌─────────────────────────────────────────────────┐
│  ZURA DOCK — 5-Tab Mobile App                   │
├──────────┬──────────┬────────┬───────┬──────────┤
│ Schedule │  Active  │ Clients│ Scale │ Settings │
└──────────┴──────────┴────────┴───────┴──────────┘

Schedule Tab:
  - PIN login gate (staff auth)
  - Today's Appointments list (Active / Scheduled groups)
  - Appointment cards with status border (blue=active)
  - "+ New Appointment" FAB
  - Appointment Detail → Services / Notes / Summary tabs

Services Tab (inside appointment):
  - Add Services picker (search, category-grouped, multi-select)
  - Bowl card grid with status lifecycle icons
  - "+ Add Bowl" → Action sheet: New Formula / From History / Favorite
  - Formula Builder: target weight chips (20g/40g/60g/Custom), ratio chips (1x/1.5x/2x)

Product Picker (full-screen modal):
  - Brand grid → Category nav → Product list
  - A-Z scrubber, Group/List toggle
  - Swatch circles, selection count badge
  - "Add To Formula" CTA

Live Dispensing:
  - Formula vs Ingredient toggle view
  - Large droplet visualization (fill level = progress)
  - Real-time weight display: current (green) / target (gray)
  - Bottom ingredient carousel with progress rings
  - Ratio badge (1x, 1.5x, etc.)
  - Action bar: Balance / Notes / More / Done

Bowl Lifecycle:
  - Detect mixing bowl overlay (BLE tare handshake)
  - In Progress → Reweighed status transitions
  - 2-step Reweigh wizard with instructional UI
  - Session completion gate (all bowls finalized)

Post-Mix Actions:
  - Action sheet: Reweigh / Close / Mix More / Continue
  - Complete Appointment confirmation

Scale Tab:
  - BLE scale connection status with green dot indicator
  - Manual fallback mode

Settings Tab:
  - Staff profile, org preferences
```

## Existing Infrastructure to Reuse

| Layer | Asset | Status |
|-------|-------|--------|
| State machines | `session-state-machine.ts`, `bowl-state-machine.ts` | Ready |
| Calculations | `mix-calculations.ts` (net usage, cost, weight) | Ready |
| Event sourcing | `mix-session-service.ts`, `useMixSessionEvents` | Ready |
| Hooks | `useMixSession`, `useMixBowls`, `useMixBowlLines`, `useReweighEvents`, `useWasteEvents` | Ready |
| Scale adapter | `scale-adapter.ts` (Manual + BLE interface) | Ready |
| Formula memory | `useInstantFormulaMemory`, `useCloneFormula`, `FormulaClonePanel` | Ready |
| Smart Mix Assist | `SmartMixAssistCard`, `formula-resolver` | Ready |
| Product catalog | `BackroomProductCatalog` finder architecture | Ready |
| Processing timers | `useProcessingTimers`, `ProcessingTimerBar` | Ready |
| Blueprints | `useServiceBlueprints`, `BlueprintChecklist` | Ready |
| UI system | Platform design system (`PlatformCard`, `PlatformButton`, etc.) | Ready |

## Build Phases

### Phase 1 — Shell and Navigation (foundation)

**New files:**
- `src/pages/Dock.tsx` — Root dock page with tab router
- `src/components/dock/DockLayout.tsx` — Full-screen mobile layout with bottom tab bar
- `src/components/dock/DockBottomNav.tsx` — 5-tab nav (Schedule, Active, Clients, Scale, Settings)
- `src/components/dock/DockPinGate.tsx` — PIN-based staff authentication screen

**Route:** Add `/dock` to `App.tsx` (no dashboard layout — standalone full-screen app)

**Design:** Dark theme (matching Vish's dark UI), uses Platform design tokens. No sidebar, no header — pure mobile-first.

### Phase 2 — Schedule Tab

**New files:**
- `src/components/dock/schedule/DockScheduleTab.tsx` — Today's appointments grouped by Active/Scheduled
- `src/components/dock/schedule/DockAppointmentCard.tsx` — Card with colored left border, client name, time, kebab menu
- `src/components/dock/schedule/DockNewAppointmentSheet.tsx` — Bottom sheet form (client, date/time, notes)

**Data:** Reuses existing appointment queries, filtered by logged-in staff member + today's date.

### Phase 3 — Appointment Detail and Services

**New files:**
- `src/components/dock/appointment/DockAppointmentDetail.tsx` — Full-screen with Services/Notes/Summary tabs
- `src/components/dock/appointment/DockServicesTab.tsx` — Bowl cards grid + "Add Bowl" + "Add Services" FAB
- `src/components/dock/appointment/DockNotesTab.tsx` — Appointment notes view/edit
- `src/components/dock/appointment/DockSummaryTab.tsx` — Session summary with costs
- `src/components/dock/appointment/DockAddServiceSheet.tsx` — Search-filtered service picker with category groups
- `src/components/dock/appointment/DockBowlActionSheet.tsx` — New Formula / From History / Favorite

**Wiring:** Uses `useMixSession`, `useMixBowls`, session state machine for lifecycle.

### Phase 4 — Formula Builder and Product Picker

**New files:**
- `src/components/dock/mixing/DockFormulaBuilder.tsx` — Target weight chips, ratio selector, developer picker
- `src/components/dock/mixing/DockProductPicker.tsx` — Full-screen modal: Brand → Category → Product with A-Z scrubber
- `src/components/dock/mixing/DockProductRow.tsx` — Swatch circle + name + category label
- `src/components/dock/mixing/DockSelectionBar.tsx` — Sticky bottom bar with count badge + "Add To Formula" CTA

**Wiring:** Queries org's `backroom_products` catalog. Uses `SmartMixAssist` formula resolver for suggestions.

### Phase 5 — Live Dispensing Experience (core)

**New files:**
- `src/components/dock/mixing/DockDispensingView.tsx` — Main dispensing screen with Formula/Ingredient toggle
- `src/components/dock/mixing/DockDropletViz.tsx` — SVG droplet with animated fill level (current/target ratio)
- `src/components/dock/mixing/DockWeightDisplay.tsx` — Large current(green)/target(gray) weight readout
- `src/components/dock/mixing/DockIngredientCarousel.tsx` — Horizontal scroll carousel with per-ingredient progress rings
- `src/components/dock/mixing/DockIngredientCard.tsx` — Card with circular progress, name, category, weight
- `src/components/dock/mixing/DockActionBar.tsx` — Balance / Notes / More / Done buttons
- `src/components/dock/mixing/DockBowlDetectOverlay.tsx` — "Detect mixing bowl" modal for BLE tare

**Wiring:** Scale adapter for real-time weight events. `useMixBowlLines` + `useAddBowlLine` for dispensing. Bowl state machine for transitions.

### Phase 6 — Reweigh and Session Completion

**New files:**
- `src/components/dock/mixing/DockReweighWizard.tsx` — 2-step modal (instructions → scale reading)
- `src/components/dock/mixing/DockPostMixSheet.tsx` — Reweigh / Close / Mix More / Continue actions
- `src/components/dock/mixing/DockCompleteSession.tsx` — Confirmation gate when all bowls finalized

**Wiring:** `useCreateReweighEvent`, `useDepleteMixSession`, `useSaveFormulaHistory`, session state machine transitions.

### Phase 7 — Scale, Clients, and Settings Tabs

**New files:**
- `src/components/dock/scale/DockScaleTab.tsx` — BLE connection UI, manual fallback toggle
- `src/components/dock/clients/DockClientsTab.tsx` — Client search with formula history
- `src/components/dock/settings/DockSettingsTab.tsx` — Staff profile, log out

**Wiring:** Scale adapter (`connect`/`disconnect`/`getConnectionState`). Client formula history hooks.

## Technical Decisions

- **Routing:** `/dock` is a standalone route, no `DashboardLayout`. Uses its own `DockLayout` wrapper with platform dark theme.
- **State:** React state + existing React Query hooks. No new global state library.
- **No new database tables.** All data writes go through the existing event-sourced command layer.
- **No new edge functions.** Everything operates on existing hooks and services.
- **Droplet SVG:** Custom SVG component with CSS clip-path animation driven by weight percentage. No external libraries.
- **Progress rings:** CSS conic-gradient circles, lightweight and performant.
- **Bottom sheets:** Radix Dialog with mobile slide-up animation (no new dependency).

## Suggested Build Order

1. Phase 1 (Shell) — get `/dock` route rendering with tab navigation
2. Phase 2 (Schedule) — appointments visible, tappable
3. Phase 3 (Appointment Detail) — services tab with bowl grid
4. Phase 4 (Product Picker) — brand/category/product selection
5. Phase 5 (Dispensing) — the core experience with droplet viz
6. Phase 6 (Reweigh/Complete) — session lifecycle closure
7. Phase 7 (Supporting tabs) — scale, clients, settings

Each phase is independently testable. Phase 5 is the largest and most complex — recommend splitting across 2-3 implementation passes.

