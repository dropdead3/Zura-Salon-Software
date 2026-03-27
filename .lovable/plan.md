

## Fix Reset to Fully Clear Service Configuration

### Problem
The "Reset" button currently only clears service-level flags (`is_backroom_tracked`, `is_chemical_service`, `container_types`, `backroom_config_dismissed`) but leaves behind:
- **Allowance policies** in `service_allowance_policies` — the service still shows "Allowance Set" badge after re-enabling tracking
- **Recipe baselines** in `service_recipe_baselines` — stale formula data persists

The service should return to a completely untouched "Needs Attention" state.

### Changes

**`src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Import `useDeleteAllowancePolicy`** from `@/hooks/billing/useServiceAllowancePolicies` (already has `useServiceAllowancePolicies` imported).

2. **Add a delete baselines mutation** using `supabase.from('service_recipe_baselines').delete().eq('service_id', id).eq('organization_id', orgId)`.

3. **Replace all 4 Reset click handlers** (lines ~954, ~978, ~1042, ~1066) with a single `handleReset(serviceId)` function that:
   - Updates the service record: `is_backroom_tracked: false`, `is_chemical_service: false`, `container_types: []`, `backroom_config_dismissed: false`
   - Deletes the allowance policy for that service (if one exists, looked up from `allowanceByService` map)
   - Deletes all recipe baselines for that service
   - Invalidates relevant query keys
   - Collapses the expanded row
   - Shows a toast: "Service reset to unconfigured"

4. **Add confirmation** — wrap the reset in a simple `window.confirm('Reset all tracking and billing configuration for this service?')` to prevent accidental clicks, since this is destructive.

### What Gets Cleared
| Data | Table | Action |
|------|-------|--------|
| Tracking flags | `services` | Set to false/empty |
| Config dismissed | `services` | Set to false |
| Allowance policy | `service_allowance_policies` | Delete row |
| Recipe baselines | `service_recipe_baselines` | Delete rows |

### Result
After reset, the service appears in the "Needs Attention" state with no badges, no allowance, no baselines — identical to a freshly imported service.

