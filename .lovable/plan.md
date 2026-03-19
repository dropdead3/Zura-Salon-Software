

# Fix "+ Add another contact" Button Styling

## Problem
The button uses `variant="ghost"` with `text-muted-foreground` which renders as light-on-light in dark mode — poor contrast and no visible padding/hover state.

## Fix
In all 4 files, replace the current button class:
```
className="font-sans text-sm text-muted-foreground px-0 hover:text-foreground"
```
with an outline-style approach that works in dark mode:
```
className="font-sans text-sm text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-foreground/40 hover:bg-accent px-3 py-1.5 rounded-md"
```

This gives:
- Visible dashed border so it reads as a clickable affordance
- Proper padding (`px-3 py-1.5`) inside the label
- Clear hover state with `bg-accent` background + border/text brightening
- No light-on-light issue — uses `muted-foreground` (adapts to dark mode) with transparent background

### Files
1. `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx` — line 355
2. `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` — line 632
3. `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx` — line 398
4. `src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx` — line 153

