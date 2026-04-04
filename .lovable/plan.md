

# Bug Cleanup Pass 5 — Remaining Tenant Location References

## Issues Found

| File | Issue | Severity |
|------|-------|----------|
| `sync-phorest-data/index.ts` | Hardcoded `mesa`, `val vista`, `lakes` keyword matching for location mapping (lines 329-338) | HIGH |
| `StylistsContent.tsx` | Hardcoded `north-mesa` / `val-vista-lakes` location counts (lines 199-200, 362-367) | MED |
| `HomepageStylists.tsx` | Same hardcoded location counts (lines 282-283) | MED |
| `FooterCTAPreview.tsx` | Sample locations use `Mesa` / `Gilbert` with `(480)` area codes | LOW |
| `LocationsSettingsContent.tsx` | Remaining tenant placeholders: `"North Mesa"`, `"Gilbert Rd & McKellips"`, `"/booking?location=north-mesa"` | LOW |
| `stylists.ts` | `Location` type still locked to `"north-mesa" \| "val-vista-lakes"`; `getLocationName` maps those IDs; stylist data references them | HIGH (tech debt, previously flagged) |
| `sampleStylists.ts` | All sample stylists use `"north-mesa"` location ID | MED |
| `ViewProfile.tsx` / `MyProfile.tsx` | Phone placeholders use `(480)` area code — minor but tenant-adjacent | LOW |
| `dockDemoData.ts` | Demo clients use `(480)` / `(602)` area codes | LOW |

## Implementation Plan

### Step 1: Fix Phorest sync location mapping
The edge function has hardcoded keyword matching (`mesa`, `val vista`, `lakes`) instead of generic matching. Replace with a dynamic approach: normalize both DB location names and Phorest branch names, then match on substring/fuzzy logic without hardcoded keywords.

### Step 2: Make stylist location counts dynamic
`StylistsContent.tsx` and `HomepageStylists.tsx` both hardcode `north-mesa` / `val-vista-lakes` counts. Replace with a dynamic loop that counts stylists per location using `useActiveLocations()` to get location names and IDs.

### Step 3: Genericize Location type in stylists.ts
Change `Location` from a union literal to `string`. Remove `getLocationName()` (consumers should resolve names from DB). Update `sampleStylists.ts` to use generic IDs like `"location-1"`.

### Step 4: Neutralize remaining placeholder text
- `LocationsSettingsContent.tsx`: `"North Mesa"` → `"Downtown"`, `"Gilbert Rd & McKellips"` → `"Main St & 1st Ave"`, `"/booking?location=north-mesa"` → `"/booking?location=downtown"`
- `FooterCTAPreview.tsx`: `Mesa`/`Gilbert` → `"Downtown"`/`"Eastside"`, phones → `(555)` prefix
- `ViewProfile.tsx` / `MyProfile.tsx`: `480-555-1234` → `555-123-4567`
- `dockDemoData.ts`: Swap `(480)`/`(602)` → `(555)` prefix

### Step 5: Deploy updated Phorest edge function

## Technical Details
- **Edge function redeployment** required for `sync-phorest-data`
- The Phorest location matching fix is the most critical — hardcoded keywords will break for any tenant that doesn't have Mesa/Val Vista locations
- `stylists.ts` type change may cascade to consumers importing `Location` — need to check dependents
- All other changes are placeholder text swaps
- **Risk**: Low for UI changes. Medium for Phorest sync (needs careful testing to ensure location matching still works for existing data)

