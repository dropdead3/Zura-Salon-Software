

# Fix "Add another contact" Button — Contrast and Readability

## Problem
The current styling uses `text-muted-foreground` which in the cream/light themes is nearly invisible. The `hover:bg-accent` is also light-on-light. The screenshot confirms the text and border are unreadable.

## Fix
Replace the className in all 4 files with higher-contrast styling:

**From:**
```
className="font-sans text-sm text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-foreground/40 hover:bg-accent px-3 py-1.5 rounded-md"
```

**To:**
```
className="font-sans text-sm text-foreground/70 hover:text-foreground border border-dashed border-foreground/25 hover:border-foreground/50 hover:bg-foreground/10 px-3 py-1.5 rounded-md"
```

Key changes:
- `text-foreground/70` instead of `text-muted-foreground` — uses the actual foreground color at 70% opacity, readable in both light and dark themes
- `border-foreground/25` and `hover:border-foreground/50` — border derived from foreground, not muted
- `hover:bg-foreground/10` instead of `hover:bg-accent` — a subtle tint of the foreground color, guaranteed to contrast against any background

### Files
1. `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx` — line 356
2. `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` — line 632
3. `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx` — line 398
4. `src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx` — line 153

