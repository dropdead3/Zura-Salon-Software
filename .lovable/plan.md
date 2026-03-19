

# Make All Dialogs Responsive with Scroll Overflow

## Problem
Dialogs can overflow the viewport on smaller screens — content gets cut off with no way to scroll. The fix needs to be global so all current and future dialogs inherit the behavior.

## Approach
Fix at the **base `DialogContent` component** level in `src/components/ui/dialog.tsx` so every dialog automatically gets responsive sizing and scroll capability. No need to touch individual dialog files.

### Changes to `src/components/ui/dialog.tsx` — `DialogContent`

Add to the base className:
- `max-h-[90vh]` — prevent dialogs from exceeding 90% of viewport height
- `overflow-y-auto` — enable vertical scrolling when content overflows
- On mobile, use full-screen approach: `max-h-[100dvh] sm:max-h-[90vh]` with `sm:m-4` margin so small screens get full height while desktop stays inset

Updated base classes:
```
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto ..."
```

This is safe because:
- Dialogs that already set their own `max-h-*` and `overflow` via className will override these defaults (Tailwind last-class wins with `cn()`)
- The drilldown dialogs use `overflow-hidden flex flex-col` which will still win when passed via className
- No individual dialog files need updating

### Also update `drilldownDialogStyles.ts`
The shared constant already has `max-h-[85vh] flex flex-col` which is correct. No change needed there.

## Summary
One file change (`dialog.tsx`) — add `max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto` to the base `DialogContent` className. All 65+ dialogs instantly become responsive and scrollable.

