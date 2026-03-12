

# Smart Mix Assist — Implementation Plan

## Overview

Smart Mix Assist is a suggestion engine that recommends starting formulas when a stylist begins a new bowl. It pulls from three data sources in priority order and presents a non-blocking suggestion card. The stylist must explicitly accept or dismiss the suggestion.

## Implementation Layers

### 1. Database Migration

**New table: `smart_mix_assist_settings`**
- `id`, `organization_id`, `is_enabled` (default false), `ratio_lock_enabled` (default false), `acknowledged_by` (UUID), `acknowledged_at` (timestamptz), `created_at`, `updated_at`
- RLS: org members SELECT, org admins UPDATE/INSERT

**New event types added to `mix_session_events`**: No schema change needed — event_type is TEXT. We add three new event type constants: `suggested_formula_generated`, `suggested_formula_applied`, `suggested_formula_dismissed`.

### 2. Service Layer: `src/lib/backroom/services/smart-mix-assist-service.ts`

**`generateSuggestion(params)`** — Core suggestion logic:
1. Check if Smart Mix Assist is enabled for the org (cache-friendly query)
2. If `client_id` + `service_name` provided → query `client_formula_history` for most recent matching formula (Priority 1)
3. If no client match and `staff_id` + `service_name` provided → query `client_formula_history` for the staff member's most-used formula for that service type (Priority 2)
4. If no staff match → query `service_recipe_baselines` for the service (Priority 3)
5. Return `{ suggestion: FormulaLine[], source: 'client_last_visit' | 'stylist_most_used' | 'salon_recipe' | null, referenceId: string | null, ratio: string | null }`

All queries hit projection/read tables only. Ratio is computed from the returned formula lines.

### 3. Command Layer: `src/lib/backroom/commands/mixing-commands.ts`

Add two new commands to the existing file:

- **`ApplySuggestedFormulaCommand`** — emits `suggested_formula_applied` event with payload: `{ suggestion_source, reference_formula_id, formula_data, service_type, client_id, staff_id }`
- **`DismissSuggestedFormulaCommand`** — emits `suggested_formula_dismissed` event

Add corresponding validators in `mixing-validators.ts` (session must be active, bowl must exist and be open).

### 4. Event Type Constants

Update `MixSessionEventType` union in `mix-session-service.ts` to include `suggested_formula_generated`, `suggested_formula_applied`, `suggested_formula_dismissed`. Add these to `VALID_EVENTS_BY_STATUS.active`.

### 5. Hook Layer: `src/hooks/backroom/useSmartMixAssist.ts`

- **`useSmartMixAssistSettings()`** — Query + mutation for org settings (enable/disable, ratio lock toggle)
- **`useFormulaSuggestion(params)`** — Calls `generateSuggestion()` from the service. Returns suggestion data. Uses `staleTime: Infinity` since suggestions don't change mid-bowl.
- **`useApplySuggestion()`** — Mutation that calls `executeApplySuggestedFormula()` command handler
- **`useDismissSuggestion()`** — Mutation that calls `executeDismissSuggestedFormula()` command handler

### 6. UI Components: `src/components/dashboard/backroom/smart-mix-assist/`

**`SmartMixAssistCard.tsx`** — The suggestion card shown when a bowl starts:
- Displays suggestion source label, line items with target weights, computed ratio
- Two actions: "Use Suggested Formula" / "Start Empty Bowl"
- Inline disclaimer text below the card
- Calls `useFormulaSuggestion()` for data

**`TargetWeightProgress.tsx`** — Per-line progress indicator shown after suggestion is applied:
- Shows target vs current weight with a `Progress` bar (uses existing `src/components/ui/progress.tsx`)
- Green indicator when target reached, amber when exceeded
- Does not block mixing

**`RatioLockIndicator.tsx`** — Small badge/indicator showing ratio lock is active, with auto-adjusted targets when base ingredient weight changes

**`SmartMixAssistSettingsCard.tsx`** — Settings panel for enabling/disabling the feature:
- Toggle for Smart Mix Assist
- Toggle for Ratio Lock
- One-time acknowledgment dialog with the required disclaimer copy before first enable

### 7. Settings Integration

Add `SmartMixAssistSettingsCard` to the existing backroom settings page. The acknowledgment dialog uses `AlertDialog` from the existing UI library.

### 8. Disclaimer Locations

1. **Settings activation**: `AlertDialog` with full disclaimer copy, requires acknowledge button before enabling
2. **Inline on suggestion card**: Static text below the card: "Suggested formula based on history and service recipes. Always review and adjust as needed. Final formulation decisions are the responsibility of the licensed stylist."
3. **Help docs**: Content update (not code — documentation text)

## Build Order

1. Migration (settings table)
2. Service (`smart-mix-assist-service.ts`)
3. Event types update in `mix-session-service.ts`
4. Commands + validators (add to existing mixing files)
5. Hook (`useSmartMixAssist.ts`)
6. UI components (card, progress, settings)
7. Wire into existing bowl creation flow

## Edge Cases

- **No history exists**: No suggestion shown, bowl starts empty
- **Multiple formulas for same service**: Most recent wins (Priority 1) or most frequent wins (Priority 2)
- **Mismatched service name**: Exact match on `service_name` only; no fuzzy matching
- **Ratio lock with manual override**: If stylist adds/removes lines after applying suggestion, ratio lock disengages for that bowl

## Performance

- Suggestion generation queries `client_formula_history` (indexed by org+client, ordered by created_at) and `service_recipe_baselines` (indexed by org+service) — both are fast indexed reads
- Suggestion is fetched once per bowl start, cached with `staleTime: Infinity`
- No raw event stream queries during rendering

