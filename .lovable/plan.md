

# Remove Visual Artifacts from Consultation Gradient Cards

## Problem
New Client Consultation appointments use the `teal-lime` gradient from `SPECIAL_GRADIENTS`. The `CardOverlays` component adds two decorative layers on all gradient cards:

1. **Glass stroke border** (lines 122–131) — a semi-transparent gradient border using CSS masking that creates a visible white halo around the card
2. **Shimmer animation** (lines 132–138) — a constantly animating white highlight sweep (`animate-shimmer`) that makes the card look like it has a persistent hover effect

These two overlays cause the artifact visible in the screenshot — a glowing/shimmering border around consultation cards that doesn't match the clean look of other appointment types.

## Fix
In `AppointmentCardContent.tsx`, remove the two gradient overlay elements from the `CardOverlays` component (lines 120–139). The gradient `background` applied via `cardStyle` already provides the visual distinction for consultation cards — the additional glass stroke and shimmer are unnecessary decoration.

### Lines to remove (inside `CardOverlays`):
```tsx
// Remove this entire block (lines 120-139):
{displayGradient && (
  <>
    <div className="absolute inset-0 rounded-sm pointer-events-none" style={{...glassStroke...}} />
    <div className="absolute inset-0 pointer-events-none animate-shimmer" style={{...shimmer...}} />
  </>
)}
```

### Files Modified
1. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — remove glass stroke + shimmer overlays from `CardOverlays`

