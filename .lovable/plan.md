

# Push Org Settings to All Locations

## Assessment: Good Idea With Guardrails

This is a **good idea** for initial setup — it eliminates the tedious process of configuring each location individually. However, it needs safety rails because:

1. **Stations are inherently location-specific** — you can't "push" a station config to another location since each station has a physical device/scale pairing. These should be excluded.
2. **Some locations may intentionally differ** — a "Push All" should warn when it would overwrite existing location overrides.
3. **It should be reversible** — if someone accidentally pushes, they need a way to undo (the existing "Reset Override" already handles this).

## What "Push to All Locations" Actually Covers

Based on the current architecture, location-scoped data lives in:

| Table | Location-scoped? | Should push? |
|-------|-----------------|-------------|
| `backroom_settings` (key-value) | Yes (location_id) | Yes — core use case |
| `backroom_alert_rules` | Yes (location_id) | Yes — same thresholds across locations |
| `backroom_stations` | Yes (location_id) | No — physical hardware is location-specific |
| `products` / `services` | No — org-scoped | N/A — already shared |
| `service_recipe_baselines` | No — org-scoped | N/A — already shared |
| `service_allowance_policies` | No — org-scoped | N/A — already shared |

## Plan

### 1. Add "Push to All Locations" Card in MultiLocationSection

Add a new card above the existing "Copy Settings" card with:
- A prominent "Push Org Defaults to All Locations" button
- Explanation: "Applies your organization-level backroom settings and alert rules to every active location. Locations with existing overrides will be listed for confirmation."
- A pre-flight check that shows: how many locations will receive settings, how many existing overrides will be replaced
- Confirmation dialog with a summary before executing
- Option to include alert rules in the push

### 2. Add "Push to All" Logic

- For `backroom_settings`: Take all org-level settings (location_id IS NULL) and upsert them as location overrides for every active location
- For `backroom_alert_rules`: Take all org-level rules (location_id IS NULL) and replicate them per location
- Skip `backroom_stations` entirely
- Show a results toast: "Pushed X settings + Y alert rules to Z locations"

### 3. Confirmation Dialog with Override Warning

Before executing, show an AlertDialog listing:
- Number of settings being pushed
- Number of locations receiving them
- Number of existing overrides that will be replaced (highlighted in amber)
- Checkbox: "Also push alert rules"

### 4. Enhance the Existing "Copy Settings" with Bulk Target

Currently copy is 1-to-1 (source → target). Add a "Copy to all other locations" option in the target dropdown so users can replicate one location's config everywhere without going through each one individually.

## Files to Modify

| File | Changes |
|------|---------|
| `MultiLocationSection.tsx` | Add "Push to All" card, confirmation dialog, bulk copy option, push logic for settings + alert rules |

Single file change — all logic is self-contained in the multi-location section using existing hooks (`useBackroomSettingsAll`, `useUpsertBackroomSetting`, `useActiveLocations`, `useUpsertAlertRule`).

