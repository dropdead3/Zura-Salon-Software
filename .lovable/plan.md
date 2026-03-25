

## Wire Chemical Toggle & Vessel Types into Service Tracking Drill-Down

### Problem
The "Color or Chemical Service" toggle and container type (Bowl/Bottle) selector live only in the Service Editor dialog. Users should be able to toggle these directly in the Service Tracking configurator drill-down, with changes syncing bidirectionally (same DB columns).

### Changes — `ServiceTrackingSection.tsx`

**1. Expand the query to include `container_types`**

Update the select query (line 137) to also fetch `container_types`. Add `container_types` to the `ServiceRow` interface.

```tsx
interface ServiceRow {
  // ... existing fields
  container_types: ('bowl' | 'bottle')[];
}
```

Query select string adds `, container_types`.

**2. Add Chemical toggle + Vessel selector in the drill-down**

In the tracked drill-down (lines 716–763, the toggles grid area), add a new row above the existing toggles:

- **"Color / Chemical" Switch** — toggles `is_chemical_service`. When turned off, also clears `container_types` to `[]` and sets `is_backroom_tracked` to false (matching Service Editor behavior). When turned on, defaults `container_types` to `['bowl']` if empty.
- **Container Types** — two toggle buttons (Bowl / Bottle) that appear only when `is_chemical_service` is true. Each toggles its presence in the `container_types` array. At least one must remain selected.

Also show the Chemical toggle in the **untracked** drill-down (lines 767–776), so users can classify a service as chemical directly from this view. When toggled on, it also enables tracking automatically.

**3. Mutation uses existing `updateService`**

The `updateService` mutation already accepts `Partial<ServiceRow>` and writes to the `services` table — same table the Service Editor writes to. No new mutation needed. Both UIs read/write the same `is_chemical_service` and `container_types` columns, so changes are automatically bidirectional.

Also invalidate `['services']` and `['org-services']` query keys in `updateService.onSuccess` to ensure the Service Editor picks up changes made here.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

