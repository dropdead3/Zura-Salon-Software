

## Add Checkmark Icon to "Requires Color/Chemical" Badge

### Change
Add a `CheckCircle2` icon (from lucide-react) to the left of the "Requires Color/Chemical" badge label in the service tracking table rows.

### Technical Detail

**File: `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`**

Line 610 — update the Badge to include an icon:
```tsx
<Badge variant="default" className="text-[10px] shrink-0 gap-1">
  <CheckCircle2 className="w-3 h-3" />
  Requires Color/Chemical
</Badge>
```

Add `CheckCircle2` to the existing lucide-react import statement.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (1 line change + import update)

