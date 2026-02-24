

## Move Confirmation Method Inline with Status Badge

### Current State
The confirmation method ("Confirmed via SMS" or "Confirmed (method unknown)") renders as a separate line below the status badges row, with its own redundant green checkmark icon -- duplicating the icon already inside the "Confirmed" badge.

### Change

In `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`:

1. **Remove the standalone "Confirmation Source Display" block** (lines 888-906) -- the entire `div` with the icon and text below the badges.

2. **Add the confirmation method as inline muted text** directly after the Confirmed badge inside the existing badges row (line 866-886). It will render as a small `span` with `text-xs text-muted-foreground` showing:
   - "via SMS" / "via Email" / "via App" (when method is known)
   - "(method unknown)" (when method is not known)
   - No extra icon -- the badge already has the status icon.

### Visual Result

Before:
```
[Confirmed]  [Redo]  [New]
(checkmark) Confirmed (method unknown)
```

After:
```
[Confirmed]  (method unknown)  [Redo]  [New]
```

### File
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`
