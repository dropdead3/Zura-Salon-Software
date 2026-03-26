

## Add Subtle Green Background to Configured Rows

### Change
Replace the `opacity-60` dim on configured rows with a subtle green background tint, so configured items stand out positively rather than fading out.

### Technical Detail

**File: `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`** (line ~564–567)

Change:
```tsx
attention && 'bg-amber-500/[0.03]',
service.backroom_config_dismissed && 'opacity-60',
```

To:
```tsx
attention && 'bg-amber-500/[0.03]',
service.backroom_config_dismissed && 'bg-emerald-500/[0.04]',
```

This removes the dimming effect and adds a very subtle emerald background fill to configured rows, complementing the green ghost badge.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

