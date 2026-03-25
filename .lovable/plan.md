

## Wire Service Editor ↔ Backroom Service Tracking Together

### Problem
Three disconnects exist:
1. `is_chemical_service` was added to `phorest_services` but the Service Editor saves to the `services` table — so the toggle currently saves nothing
2. Service Tracking in Backroom uses regex-based detection (`isColorOrChemicalService`) and manual toggles, completely disconnected from the Service Editor's chemical toggle
3. The "Available Services" list in Backroom shows every service (haircuts, blowouts, etc.) when it should only show chemical/color services

### Solution
Create a single source of truth: toggling "Color or Chemical Service" ON in the Service Editor automatically enables backroom tracking, and Service Tracking in Backroom reflects this.

### Changes

#### 1. Migration — add `is_chemical_service` to `services` table
```sql
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_chemical_service boolean NOT NULL DEFAULT false;

-- Backfill from existing data
UPDATE public.services SET is_chemical_service = true
  WHERE container_types IS NOT NULL AND array_length(container_types, 1) > 0;
UPDATE public.services SET is_chemical_service = true
  WHERE is_backroom_tracked = true;
```

#### 2. `useServicesData.ts` — add field to Service interface and create/update mutations
- Add `is_chemical_service: boolean` to the `Service` interface
- In `useCreateService`, include `is_chemical_service` and auto-set `is_backroom_tracked: true` when chemical
- In `useUpdateService`, the generic update already passes through all fields — no change needed, but ensure `is_backroom_tracked` syncs

#### 3. `ServiceEditorDialog.tsx` — auto-sync backroom tracking
When submitting, if `isChemicalService` is toggled ON, also send `is_backroom_tracked: true`. If toggled OFF, send `is_backroom_tracked: false` and `container_types: []`. This eliminates the need for users to separately enable tracking in Backroom.

#### 4. `ServiceTrackingSection.tsx` — use `is_chemical_service` flag
- Add `is_chemical_service` to the `ServiceRow` interface and query
- **Available Services list**: filter to only show services where `is_chemical_service === true` AND `is_backroom_tracked === false` (instead of showing all untracked services)
- **Auto-detect banner**: use `is_chemical_service` flag as primary signal, fall back to regex for services that haven't been configured yet
- Keep existing manual toggle and "Track All" for services flagged as chemical but not yet tracked

### Resulting Flow
```text
Service Editor                      Backroom Service Tracking
┌─────────────────┐                ┌──────────────────────────┐
│ Toggle: Color or │──── ON ──────▶│ is_backroom_tracked=true │
│ Chemical Service │                │ Shows in "Tracked" list  │
│                  │──── OFF ─────▶│ is_backroom_tracked=false│
│ Container Types  │                │ Removed from tracking    │
│ (Bowl / Bottle)  │                └──────────────────────────┘
└─────────────────┘                         │
                                            ▼
                                   Configure: Components,
                                   Allowances, Mix Assist,
                                   Asst. Prep, etc.
```

### Files Modified
- Database migration (new column on `services`)
- `src/hooks/useServicesData.ts` — interface + create mutation
- `src/components/dashboard/settings/ServiceEditorDialog.tsx` — sync `is_backroom_tracked` on submit
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — filter Available Services to chemical-only

