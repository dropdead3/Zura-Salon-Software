

## Fix Scroll-Down Indicator Z-Index

**Problem:** The bouncing ChevronDown scroll indicator is hidden behind appointment cards and the gradient overlay. `z-25` is not a standard Tailwind class — it gets ignored, so the element has no z-index applied.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx` (line 263)

Replace `z-25` with `z-[30]` (arbitrary value Tailwind supports) to ensure the indicator renders above the cards and the top fade overlay (`z-10`).

```tsx
// Before
className="pointer-events-none absolute bottom-2 left-0 right-0 z-25 flex justify-center transition-opacity duration-300"

// After
className="pointer-events-none absolute bottom-2 left-0 right-0 z-[30] flex justify-center transition-opacity duration-300"
```

One class change, one file.

