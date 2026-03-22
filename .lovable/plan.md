

## Remove Bottom Gradient Covering Appointment Cards

**Problem:** The scroll indicator at the bottom of the schedule tab includes a `h-12` gradient overlay that covers appointment cards.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

**Lines 257-264:** Remove the entire scroll indicator block (gradient + bouncing chevron):

```tsx
// Delete this entire block
<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center pb-3 transition-opacity duration-300"
  style={{ opacity: showScrollIndicator ? 1 : 0 }}
>
  <div className="w-full h-12 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent" />
  <ChevronDown className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))] animate-bounce" />
</div>
```

Also clean up the `showScrollIndicator` state and `checkScroll` logic if they're no longer used elsewhere.

One file, one deletion.

