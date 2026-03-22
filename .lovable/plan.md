

## Fix Top Gradient Covering Content at Scroll Top

**Problem:** The `pt-12` padding was added to match the `h-12` gradient, but content at exactly the gradient boundary is still partially obscured because the gradient transitions from fully opaque to transparent across its height. Content needs to start *below* the fully opaque zone.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

**Line 243:** Increase top padding from `pt-12` to `pt-16` to give extra clearance beyond the gradient's fade zone:

```tsx
className="h-full overflow-y-auto px-5 pt-16 pb-56 space-y-8"
```

This ensures the first section header ("ACTIVE") starts well below the gradient's opaque-to-transparent transition, preventing any visual overlap.

One class change, one line.

