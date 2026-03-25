

## Gate Backroom Container Types Behind a "Requires Color/Chemical" Toggle

### Problem
The container types selector currently appears on all services, including haircuts and other non-chemical services where it's irrelevant.

### Solution
Add a "Color or Chemical Service" toggle above the container types section. Container types only appear when this toggle is enabled. When disabled, container types reset to an empty array so Backroom doesn't track formulations for that service.

### Database
Add a `is_chemical_service` boolean column (default `false`) to `phorest_services` so the setting persists.

### File Changes

#### 1. Migration — add column
```sql
ALTER TABLE public.phorest_services
  ADD COLUMN IF NOT EXISTS is_chemical_service boolean NOT NULL DEFAULT false;
```

#### 2. `ServiceEditorDialog.tsx`
- Add `isChemicalService` state, initialized from `initialData.is_chemical_service ?? false`
- On create default: `false`
- Include `is_chemical_service` in the submit payload
- Replace the current container types block with:
  - A toggle row: **"Color or Chemical Service"** with tooltip: *"Enable for services that involve color, lightener, toner, or other chemical formulations tracked by Zura Backroom."*
  - When toggled ON → show the existing container types checkboxes (Bowl / Bottle) indented below
  - When toggled OFF → hide container types and reset `containerTypes` to `[]`

#### 3. `useServicesData.ts` (Service type)
- Add `is_chemical_service?: boolean` to the Service interface if not auto-generated from types.ts

### UI Behavior
- Toggle OFF (default for new services) → container types hidden, no Backroom tracking
- Toggle ON → container types appear with Bowl pre-checked, matching current default
- Editing an existing service that already has container types set → auto-detect: if `is_chemical_service` is true or `container_types` has entries, show toggle as ON

