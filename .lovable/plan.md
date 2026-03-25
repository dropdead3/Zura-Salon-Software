

## Fix "Classify Services" False Completion

### Root Cause

The "Classified" milestone and Quick Setup filter treat any service with a non-null `category` as classified. Since categories come from POS imports, nearly every service already has one — so 74/74 shows on day one without any user action.

The deeper issue: `is_chemical_service` is a `boolean NOT NULL DEFAULT false`. There's no distinction between "user explicitly marked as standard" and "never reviewed."

### Fix: Make `is_chemical_service` Nullable

Change the column to `boolean DEFAULT NULL`. The three states become:
- `NULL` → unclassified (needs review)
- `true` → chemical
- `false` → explicitly standard

### Changes

**1. Database migration**

```sql
ALTER TABLE public.services
  ALTER COLUMN is_chemical_service DROP NOT NULL,
  ALTER COLUMN is_chemical_service SET DEFAULT NULL;

-- Reset all services that were never explicitly classified
-- (those still at the old default of false)
-- We keep true values since the user explicitly set those.
-- For false values, we can't distinguish user-set from default,
-- so reset all false to NULL. Users will re-classify via the wizard.
UPDATE public.services
  SET is_chemical_service = NULL
  WHERE is_chemical_service = false;
```

**2. Update milestone logic — `ServiceTrackingSection.tsx` (line 237)**

```tsx
// OLD
const classified = allServices.filter(s => s.is_chemical_service || s.category !== null);

// NEW — classified means user explicitly set is_chemical_service to true or false
const classified = allServices.filter(s => s.is_chemical_service !== null);
```

**3. Update Quick Setup filter — `ServiceTrackingQuickSetup.tsx` (line 86)**

```tsx
// OLD
const uncategorized = services.filter(s => !s.is_chemical_service && !s.category);

// NEW — show services where is_chemical_service is null (never reviewed)
const uncategorized = services.filter(s => s.is_chemical_service === null);
```

**4. Update `getServiceType` helper — `ServiceTrackingSection.tsx` (line 217)**

```tsx
const getServiceType = (s: ServiceRow): 'chemical' | 'suggested' | 'standard' => {
  if (s.is_chemical_service === true) return 'chemical';
  if (s.is_chemical_service === null && isSuggestedChemicalService(s.name, s.category)) return 'suggested';
  return 'standard';
};
```

Services explicitly set to `false` won't get the "suggested" badge — user already decided.

**5. Update `ServiceRow` interface**

Change `is_chemical_service: boolean` → `is_chemical_service: boolean | null` in both files.

**6. Quick Setup classify action**

The toggle already sets `is_chemical_service: true/false`. Add a "Mark as Standard" button for non-chemical services so users can explicitly set `false` (classifying them) without toggling chemical on.

### Files Modified
- New SQL migration (make `is_chemical_service` nullable, reset false→NULL)
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (milestone calc, getServiceType, interface)
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (filter logic, interface, add "Standard" action)

