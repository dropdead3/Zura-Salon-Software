

# Instant Formula Memory — Implementation Plan

## Architecture

Thin read-only layer that surfaces the most relevant previous formula when an appointment opens. Reuses the existing `FormulaResolver` for resolution logic and `client_formula_history` for data. No new tables, no mutations (except event tracking via existing `mix_session_events`).

```text
Appointment opens
  → useInstantFormulaMemory hook
  → FormulaResolver.resolveFormula() (existing)
  → + fetchClientAnyFormula() (new Priority 2: any service)
  → InstantFormulaCard UI
  → "Use Last Formula" → preloads SmartMixAssist
```

## Formula Selection Logic

Extended priority over the existing 3-tier resolver:

1. Client's most recent formula **for the same service type** (existing `fetchClientLastFormula`)
2. Client's most recent formula **for any service** (new — query `client_formula_history` by client_id only, no service filter)
3. Salon service recipe baseline (existing `fetchSalonRecipe`)
4. No formula → show empty state message

Note: Priority 2 from SmartMixAssist (stylist's most used) is skipped here — Instant Formula Memory is client-centric, not stylist-centric.

## Implementation

### 1. Add `fetchClientAnyFormula` to `formula-resolver.ts`

New function: queries `client_formula_history` for the client regardless of service name, returns the most recent one. Returns with source `'client_any_service'` (new source type added to `SuggestionSource` union).

### 2. Add `resolveFormulaMemory` to `formula-resolver.ts`

New resolution function with the 4-priority Memory hierarchy (distinct from `resolveFormula` which is mixing-focused). Returns `ResolvedFormula` plus additional metadata fields: `service_name`, `staff_name`, `notes`, `created_at`.

### 3. Hook: `src/hooks/backroom/useInstantFormulaMemory.ts`

- `useInstantFormulaMemory(clientId, serviceName)` — Calls `resolveFormulaMemory()`, returns formula + metadata
- `staleTime: Infinity` — Formula doesn't change while viewing an appointment
- Enabled only when `clientId` is present

### 4. Event tracking additions

Add 3 new event type constants to `MixSessionEventType`:
- `formula_memory_displayed`
- `formula_memory_used`
- `formula_memory_dismissed`

Add to `VALID_EVENTS_BY_STATUS.active` and `VALID_EVENTS_BY_STATUS.draft`.

### 5. UI Component: `src/components/dashboard/backroom/InstantFormulaCard.tsx`

Card displayed at the top of BackroomTab showing:
- Header: "Last Visit — {service_name}" + date
- Formula lines (reuses existing `FormulaPreview` component)
- Notes (if present)
- Two actions: "Use Last Formula" / "View Formula History"
- Empty state when no formula exists

"Use Last Formula" emits `formula_memory_used` event and passes formula data to SmartMixAssist's suggestion preload.

### 6. Wire into `BackroomTab.tsx`

Add `InstantFormulaCard` above `MixSessionManager`. Pass `clientId` and `serviceName` from appointment context.

## Build Order

1. Extend `formula-resolver.ts` (new source type + `fetchClientAnyFormula` + `resolveFormulaMemory`)
2. Add event types to `mix-session-service.ts`
3. Create `useInstantFormulaMemory.ts` hook
4. Create `InstantFormulaCard.tsx` component
5. Wire into `BackroomTab.tsx`

## Edge Cases

| Case | Handling |
|---|---|
| No client ID | Card not shown |
| No formula history | Empty state: "No previous formula on file" |
| Formula from different service | Shows with label "Last used for {other_service}" |
| Multiple formulas same date | Most recent by `created_at` wins |
| Client has only refined formulas | Shows refined formula (no type filter) |

