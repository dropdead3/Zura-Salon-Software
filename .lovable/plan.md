

## Fix: Gradient Covering Scrollbar

**Problem:** The gradient overlay at `z-20` uses `inset-x-0` which spans the full width including the scrollbar area, obscuring the scroll thumb.

**File:** `src/components/dock/DockLayout.tsx` — line 104

**Change:** Add right padding to the gradient so it doesn't cover the scrollbar. Replace `inset-x-0` with `left-0 right-3` (12px inset from the right edge to clear the scrollbar track):

```tsx
// Before
<div className="absolute bottom-0 inset-x-0 z-20 h-32 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent pointer-events-none" />

// After
<div className="absolute bottom-0 left-0 right-3 z-20 h-32 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent pointer-events-none" />
```

Single class change — swaps `inset-x-0` for `left-0 right-3` to leave room for the scrollbar handle.

