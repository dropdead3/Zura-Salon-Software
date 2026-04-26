# Add arrow-key hotkeys for location & view toggling on org dashboard

## Goal
Mirror the schedule page hotkey doctrine on `DashboardHome`:
- **↑ / ↓** — cycle through individual locations (skipping aggregate "All Locations"), wrapping at ends
- **← / →** — toggle Simple ↔ Detailed view
- **Sonner toast** confirms each change (1.5s, no description)

## Files

### 1. NEW — `src/hooks/useDashboardHotkeys.ts`
Modeled on `src/hooks/useScheduleHotkeys.ts` (proven page-local pattern).

```ts
useDashboardHotkeys({
  locationId, setLocationId,
  accessibleLocations,         // real locations only — aggregate is implicit ('')
  compactView, setCompactView, // false=Detailed, true=Simple (matches existing cc-view-mode)
})
```

Behavior:
- Skip when target is INPUT/TEXTAREA/SELECT, contentEditable, or inside `[role="dialog"]`
- Skip when meta/ctrl/alt held
- **ArrowLeft** → `setCompactView(false)` + toast `Switched to Detailed view`
- **ArrowRight** → `setCompactView(true)` + toast `Switched to Simple view`
- **ArrowUp / ArrowDown** → cycle through `accessibleLocations` with wrap; toast `Viewing: <name>`
  - If current `locationId === ''` (aggregate), Down starts at index 0, Up at last
  - No-op if `accessibleLocations.length <= 1`
- All matched keys call `event.preventDefault()` to suppress page scroll

### 2. EDIT — `src/pages/dashboard/DashboardHome.tsx`
- Import and call the new hook near existing `locationId` / `compactView` state (around lines 168–177)
- Pass `accessibleLocations` from `useUserLocationAccess`
- No other changes

### 3. EDIT — `src/hooks/useKeyboardShortcuts.ts`
Add three documentation-only entries under a new **Dashboard** category so the `?` help dialog lists them:
- `←` — Switch to Detailed view
- `→` — Switch to Simple view
- `↑ / ↓` — Cycle locations

Handlers are no-ops here — actual handling lives in the page-local hook (active only on dashboard). Same separation as `useScheduleHotkeys`.

### 4. EDIT — `mem://style/platform-ui-standards-and-privacy`
Append "Dashboard / Schedule hotkey doctrine" subsection:
- Arrow keys reserved for primary axis-toggles on data-dense surfaces
- Toast feedback required for transient state toggles (distinct from `h`, which is a persistent privacy state visible globally via blur)
- Page-local `use<Page>Hotkeys` for state-dependent bindings; global `useKeyboardShortcuts` for nav/help

## Out of scope
- `CommandCenterControlRow`, `AnalyticsFilterBar`, `LocationSelect`, `LocationMultiSelect` UI
- Prefetching adjacent locations (revisit if cycling feels sluggish)
- The `h` privacy hotkey

## Verification
1. `/org/drop-dead-salons/dashboard` → press `→` → Simple view + toast
2. Press `←` → Detailed view + toast
3. Press `↓` → next location selected + toast with name; wraps past the last
4. Press `?` → shortcuts dialog shows new "Dashboard" section
5. Focus an Add Task textarea → arrows behave normally, no hijack
6. Open any dialog → arrows do nothing on dashboard underneath