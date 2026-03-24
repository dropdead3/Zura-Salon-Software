

## Make Drag Handle Visible on Hamburger Menu

**Problem:** The drag handle exists in code (lines 163-166) but is nearly invisible due to the 30% opacity on the dark background.

### Change — `src/components/dock/DockHamburgerMenu.tsx`

1. Increase handle opacity from `0.3` to `0.5` for better visibility on the dark platform background
2. Add more bottom padding (`pb-4` instead of `pb-3`) so the handle has breathing room and doesn't feel clipped
3. Increase `pt-1` to `pt-2` for better visual separation from Lock Station

```tsx
{/* Drag handle — bottom position for top-anchored sheet */}
<div className="flex justify-center pb-4 pt-2">
  <div className="w-12 h-1.5 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.5)] cursor-grab active:cursor-grabbing" />
</div>
```

One file, one line block updated.

