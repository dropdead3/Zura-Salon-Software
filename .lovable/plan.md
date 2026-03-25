

## Smarter Service Tracking Suggestions

### Problem
The "Suggested Services" list includes Extensions (installs/reinstalls), Haircuts, and other non-chemical services. This happens because:
1. The backfill migration set `is_chemical_service = true` for any service that was previously `is_backroom_tracked`, regardless of category
2. The `isColorOrChemicalService` regex fallback doesn't exclude non-chemical categories
3. Suggestions and "Available" list both show the same unfiltered set

### Solution

#### 1. Define non-chemical category exclusions
Add a `NON_CHEMICAL_CATEGORIES` set to `serviceCategorization.ts`:
```
Haircut, Extensions, Styling, New Client Consultation
```
Add a helper `isSuggestedChemicalService(name, category)` that returns true only if the service matches the chemical regex AND its category is NOT in the exclusion set.

#### 2. Fix suggestion filtering in `ServiceTrackingSection.tsx`
- **Suggested Services**: Use the new category-aware helper — exclude Haircuts, Extensions, Styling, Consultations from suggestions
- **Available Services**: Show services where `is_chemical_service === true` (explicit flag from Service Editor) regardless of category — these are intentionally configured by the user
- Separate the two concepts: "suggested by AI" vs "explicitly flagged by admin"

#### 3. Migration — clean up bad backfill data
```sql
UPDATE public.services SET is_chemical_service = false
WHERE is_chemical_service = true
AND category IN ('Haircut', 'Extensions', 'Styling', 'New Client Consultation');
```
This corrects extension/haircut services that were incorrectly flagged during the earlier backfill.

### Files Modified
- `src/utils/serviceCategorization.ts` — add `NON_CHEMICAL_CATEGORIES` set and `isSuggestedChemicalService` helper
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — use category-aware filtering for suggestions
- Database migration — clean up incorrectly flagged services

