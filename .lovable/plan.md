

# Service Blueprinting — Implementation Plan

## Existing Infrastructure

- `services` table has `duration_minutes`, `processing_time_minutes`, `finishing_time_minutes`, `content_creation_time_minutes` — time segments already exist
- `service_recipe_baselines` table already maps products to services with expected quantities
- `RecipeBaselinesManager` component exists for managing baselines in settings
- `FormulaResolver` uses baselines as the third-priority source for SmartMixAssist
- `useAssistantDailyPrep` identifies color services for assistant prep
- `useServicesData` provides full service CRUD

## Architecture

New table `service_blueprints` stores ordered steps per service. No changes to existing tables — baselines remain as-is and are referenced by `mix_step` entries.

```text
services (existing)
  → service_blueprints (new, 1:many)
     → step_type, position, metadata JSON
  → service_recipe_baselines (existing, referenced by mix steps)

Blueprint consumed by:
  → SmartMixAssist (mix steps enrich formula suggestions)
  → AssistantDailyPrep (prep steps shown in daily view)
  → Stylist appointment workspace (step checklist)
  → Predictive Backroom (product usage forecasting)
```

## Database

### New table: `service_blueprints`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | |
| service_id | uuid FK → services | |
| position | integer | Step order |
| step_type | text | `mix_step`, `assistant_prep_step`, `application_step`, `processing_step`, `rinse_step`, `finish_step` |
| title | text | Display name |
| description | text, nullable | Instructions/notes |
| metadata | jsonb, default `{}` | Type-specific data (see below) |
| created_by | uuid, nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint on `(organization_id, service_id, position)`.

RLS: org-member read, admin/manager write.

### Metadata schemas by step type

- **mix_step**: `{ product_id?, baseline_id?, target_weight_g?, ratio_guidance?, notes? }`
- **assistant_prep_step**: `{ tasks: string[] }` — e.g. `["prepare foils", "stage bowls"]`
- **processing_step**: `{ recommended_minutes?, timer_enabled? }`
- **application_step / rinse_step / finish_step**: `{ notes? }`

## Implementation Layers

### 1. Migration
Create `service_blueprints` table with RLS policies.

### 2. Hook: `src/hooks/backroom/useServiceBlueprints.ts`
- `useServiceBlueprint(serviceId)` — ordered steps for one service
- `useUpsertBlueprintStep()` — create/update step
- `useDeleteBlueprintStep()` — remove step
- `useReorderBlueprintSteps()` — batch position update

### 3. Pure engine: `src/lib/backroom/blueprint-engine.ts`
- `BlueprintStep` interface + step type constants
- `getBlueprintMixSteps(steps)` — filter mix steps for SmartMixAssist
- `getBlueprintPrepTasks(steps)` — extract assistant prep tasks
- `getProcessingTime(steps)` — sum recommended processing times
- `resolveBlueprintForSession(steps, formulaLines)` — merge blueprint with actual formula data for runtime display

### 4. Owner UI: `src/components/dashboard/settings/services/BlueprintEditor.tsx`
- Step list with drag-to-reorder (existing dnd-kit)
- Add step button with type picker
- Per-step form: title, description, type-specific fields
- Mix steps link to existing recipe baselines
- Processing steps have optional timer duration
- Accessible from service detail in Settings → Services & Schedule

### 5. Stylist UI: `src/components/dashboard/backroom/BlueprintChecklist.tsx`
- Rendered in appointment/mix session workspace
- Ordered step list with checkboxes
- Steps can be marked complete or skipped
- Completion state stored in-memory (not persisted — advisory only)
- Mix steps show linked formula suggestion
- Processing steps show optional timer button
- Empty state when service has no blueprint

### 6. Integration Points

**SmartMixAssist**: `FormulaResolver` already uses `service_recipe_baselines`. Blueprint mix steps reference the same baselines — no resolver changes needed. The `BlueprintChecklist` surfaces the resolved formula alongside the mix step.

**Assistant Prep Mode**: `useAssistantDailyPrep` enhanced to also fetch blueprint `assistant_prep_step` entries for each appointment's service, displaying prep task lists in the daily prep view.

**Predictive Backroom**: Blueprint mix steps with `target_weight_g` improve demand forecasting accuracy. The forecast service can read blueprints to get expected product quantities per service.

## Build Order

1. Database migration (table + RLS)
2. `blueprint-engine.ts` (types + pure functions)
3. `useServiceBlueprints.ts` (CRUD hooks)
4. `BlueprintEditor.tsx` (owner settings UI)
5. `BlueprintChecklist.tsx` (stylist runtime UI)
6. Integration: enhance `useAssistantDailyPrep` to include blueprint prep tasks

## Edge Cases

| Case | Handling |
|---|---|
| Service without blueprint | No checklist shown; all existing flows unchanged |
| Step overrides | Checklist is advisory; stylist can skip/ignore any step |
| Blueprint edited mid-session | Active sessions use snapshot at session start (in-memory) |
| Deleted service | Cascade delete blueprint steps via FK |
| Multiple mix steps | Each rendered separately with its own product/baseline reference |

