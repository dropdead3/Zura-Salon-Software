

# Fix Level Criteria Dialog Responsiveness

## Problem

The Level Criteria dialog is positioned at `left-[50%]` of the **full viewport**, but the sidebar (~280px) occupies the left side. At narrower window widths, the dialog's left edge gets hidden behind the sidebar.

## Fix

**File:** `src/components/dashboard/settings/GraduationWizard.tsx` (line 662)

Update the `DialogContent` className to shift the dialog's centering to account for the sidebar on larger screens:

- Add `sm:left-[calc(50%+140px)] sm:translate-x-[calc(-50%-140px)]` — this offsets the dialog center by half the sidebar width (~280px) so it stays centered within the **content area**, not the viewport.

Alternatively (simpler, more robust): add `mx-auto` and constrain with `sm:max-w-[min(32rem,calc(100vw-320px))]` so the dialog never exceeds the available content width.

**Recommended approach:** Override just the `left` positioning on the `DialogContent` for this specific dialog:

```
className="sm:max-w-lg sm:left-[calc(50%+140px)] p-0 gap-0 overflow-hidden"
```

This keeps the dialog centered in the visible content area rather than the full viewport, preventing the sidebar from clipping it.

## Scope
- Single className change on line 662
- No structural or database changes

