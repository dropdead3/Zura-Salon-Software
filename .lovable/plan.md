

## Pluralize Vessel Labels: "bowl" → "Bowls", "bottle" → "Bottles"

### Change
On line 742 of `ServiceTrackingSection.tsx`, the button label renders `{vt}` which outputs lowercase singular "bowl" / "bottle". Change to display pluralized, capitalized labels: "Bowls" and "Bottles".

### Technical Detail

**File: `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`** (line 742)

Replace:
```tsx
{vt}
```

With:
```tsx
{vt === 'bowl' ? 'Bowls' : 'Bottles'}
```

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

