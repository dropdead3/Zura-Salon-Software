

# Phorest Staff Photo Sync

## What This Does
During staff sync, capture the photo URL from Phorest's API response and auto-populate `employee_profiles.photo_url` for mapped staff who don't already have a manually uploaded photo. Also store it on `phorest_staff_mapping` for reference.

## Changes

### 1. Database Migration
Add `phorest_photo_url` column to `phorest_staff_mapping` to store the raw Phorest CDN URL separately from the employee profile photo (which may be manually overridden).

```sql
ALTER TABLE public.phorest_staff_mapping
ADD COLUMN IF NOT EXISTS phorest_photo_url TEXT;
```

### 2. Edge Function: `sync-phorest-data/index.ts`

Modify `syncStaff()` (lines 147–215):

- Extract `photo` / `photoUrl` / `image` field from each staff object (Phorest uses varying field names — we'll check all candidates)
- Upsert `phorest_photo_url` on `phorest_staff_mapping` for all staff (mapped and unmapped)
- For mapped staff where `employee_profiles.photo_url` is null, auto-populate it with the Phorest photo URL
- Log the full staff object shape on first sync to confirm exact field names

**Key logic:**
```ts
const photoUrl = s.photo || s.photoUrl || s.imageUrl || s.image || null;
```

After mapping resolution:
- Update `phorest_staff_mapping.phorest_photo_url` for all entries
- For entries with a `user_id`, check if `employee_profiles.photo_url` is null — if so, set it to the Phorest photo URL

### 3. No UI Changes Needed
The app already reads `employee_profiles.photo_url` everywhere (avatars, team stats, sales data, dock). Once the photo URL is populated, headshots will appear automatically across all surfaces.

## Safeguards
- **Manual override preserved**: Only populates `employee_profiles.photo_url` when it's currently null — never overwrites a manually uploaded photo
- **Phorest URL stored separately**: `phorest_photo_url` on the mapping table preserves the original source, so a re-sync can refresh it without touching manual overrides
- **CDN reliability**: Phase 1 uses Phorest CDN URLs directly. If URLs prove unstable, Phase 2 can re-host to Lovable Cloud storage

## Summary

| Type | Count |
|------|-------|
| Migration | 1 (add column to `phorest_staff_mapping`) |
| Modified files | 1 (`sync-phorest-data/index.ts` — `syncStaff` function) |
| New files | 0 |

