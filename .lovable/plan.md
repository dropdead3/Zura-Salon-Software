

## Fix: Case Mismatch Between Stored Specialties and Specialty Options

**Root Cause:** The database stores specialties in UPPERCASE (`EXTENSIONS`, `BLONDING`) but `specialty_options` uses title case (`Extensions`, `Blonding`). The `includes()` check is case-sensitive, so:
- Specialty buttons above show as **unselected** (no match)
- Highlighted services section renders `formData.specialties` values directly (the uppercase ones still appear)

### Changes — `src/pages/dashboard/MyProfile.tsx`

**1. Normalize specialties on load (around line 198)**
When initializing `formData`, map stored specialties to match the canonical names from `specialtyOptions`:

```typescript
// Before:
specialties: profile.specialties || [],

// After: normalize to match specialtyOptions casing
const normalizedSpecialties = (profile.specialties || []).map((s: string) => {
  const match = specialtyOptions.find(opt => opt.name.toLowerCase() === s.toLowerCase());
  return match ? match.name : s;
});
```

This requires `specialtyOptions` to be available when setting formData. If the timing doesn't work, an alternative is to do case-insensitive comparison in `isSelected` checks.

**2. Alternative (simpler): Case-insensitive comparison in `isSelected` (line 1154)**
Change `formData.specialties.includes(specialty)` to a case-insensitive check:
```typescript
const isSelected = formData.specialties.some(s => s.toLowerCase() === specialty.toLowerCase());
```

Apply the same fix in `toggleSpecialty`, `toggleHighlightedService`, and the highlighted services rendering.

**Recommended approach:** Normalize on load (option 1) since it fixes all downstream comparisons at once and ensures saved data matches canonical casing going forward.

