

## Add "and/or" Separator Between Vessel Chips

### Change
Insert a small "and/or" text between the bowl and bottle toggle chips to signal that both can be selected simultaneously.

### Technical Detail

**File: `ServiceTrackingSection.tsx`** (lines 707–733)

Replace the `.map()` rendering with explicit bowl and bottle buttons separated by an "and/or" label:

```tsx
<div className="flex items-center gap-1.5">
  <span className="text-[10px] font-sans text-muted-foreground">Vessels:</span>
  {/* Bowl chip */}
  {renderVesselChip('bowl', service)}
  <span className="text-[9px] font-sans text-muted-foreground/60 italic">and/or</span>
  {/* Bottle chip */}
  {renderVesselChip('bottle', service)}
</div>
```

Extract the chip rendering into a small inline helper or simply unroll the two chips with the separator between them. The "and/or" text uses `text-[9px]` italic muted styling so it reads as a hint without competing with the chips.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

