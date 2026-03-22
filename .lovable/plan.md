

## Fix: Floating Bottom Nav Not Rendering Correctly

**Root cause:** The dock content container (`div` at line 66 of `DockLayout.tsx`) has `relative flex flex-col` but no height constraint (`h-full`). Without a defined height:
- `absolute bottom-0` on the nav has no reference — the container just grows to content height
- `flex-1 min-h-0` on the content area can't constrain overflow properly
- The scroll `pb-28` padding has no effect because the container isn't bounded

**File:** `src/components/dock/DockLayout.tsx`

**Fix — line 66:** Add `h-full` to the dock content container:

```tsx
className="relative h-full flex flex-col bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]"
```

This single class addition gives the container a bounded height from its parent (either the device frame in constrained mode, or the `fixed inset-0 flex flex-col` wrapper in full mode), making `absolute bottom-0` and `flex-1` work correctly.

