

## Add Bottom Gradient Fade to iPad Frame

**Goal:** Add a smooth gradient overlay at the bottom of the dock content area that fades from transparent to the background color, sitting above cards but below the lock FAB and chevron indicator.

### Change — `src/components/dock/DockLayout.tsx`

Add a `pointer-events-none` gradient div inside `dockContent`, positioned absolutely at the bottom, between the content area and the FAB (z-20, since FAB is z-30):

```tsx
{/* Bottom fade gradient */}
<div className="absolute bottom-0 inset-x-0 h-24 z-20 pointer-events-none bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent" />
```

Place it after the content `div` and before the Lock FAB. The gradient uses the platform background color so it blends seamlessly.

One file, one line added.

