

## Remove Components Button and Configurator

The Components button and `ComponentMappingDialog` are no longer needed — inventory mapping happens automatically during scale/formula workflows, not through manual configuration.

### Changes — `ServiceTrackingSection.tsx`

1. **Remove the Components button** (lines 785–795) — the entire `div` containing the "Components" button with the Package icon.

2. **Remove the `ComponentMappingDialog` render** (lines 1019–1027) — the conditional block that opens the dialog.

3. **Remove the `ComponentMappingDialog` function** (lines 1041–1169) — the entire component definition at the bottom of the file.

4. **Remove `selectedServiceId` state** (line 62) — no longer needed.

5. **Remove `componentsByService` memo** (lines 229–235) and `allComponents` query (line 117) — derived data and hook call only used for the components feature.

6. **Remove `hasComponents` variable** (line 549) — used in the drill-down row.

7. **Clean up imports** — remove `useServiceTrackingComponents`, `useUpsertTrackingComponent`, `useDeleteTrackingComponent` from hooks import; remove `Package`, `Trash2`, `Plus` from lucide if no longer used elsewhere; remove unused UI imports (`Table`, `TableHeader`, etc.) if only used by the dialog.

8. **Clean up `needsAttention` and progress references** — remove any logic that flags a service as needing attention due to missing components (the allowance-only check remains).

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

