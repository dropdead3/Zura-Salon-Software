

## Restyle Service Tracking Progress Card to Match Amber Ghost Theme

### Problem
The Service Tracking progress card uses generic `bg-primary/5` and white/muted styling, while the Color Bar Setup Banner above it uses a distinctive amber ghost aesthetic (`border-amber-500/30`, `bg-amber-50 dark:bg-amber-500/[0.08]`, amber accents). They should feel like part of the same setup system.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingProgressBar.tsx`**

Restyle all visual elements to match the amber ghost palette from `ColorBarSetupBanner`:

1. **Outer container** — Add `rounded-xl border border-amber-500/30 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/[0.08] p-5` wrapper around the entire card content
2. **Overall progress bar** — Change `indicatorClassName` from `bg-primary` to `bg-amber-500`
3. **"Setup Progress" title** — Change to `text-foreground` (already is, keep)
4. **Completed section** — Change `bg-primary/5` to `bg-amber-500/10 dark:bg-amber-500/10`, divider from `divide-primary/10` to `divide-amber-500/20`, check icon from `text-primary` to `text-amber-500`, label text from `text-primary` to `text-amber-600 dark:text-amber-400`
5. **Remaining step numbers** — Keep the existing amber styling (already amber for in-progress)
6. **Remaining progress bars** — Keep `bg-amber-500` for in-progress (already correct)
7. **Celebration overlay** — Change `border-primary/20 bg-primary/5` to `border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.08]`, and accent ring from `border-primary/20 bg-primary/10` to `border-amber-500/30 bg-amber-500/10`, text from `text-primary` to `text-amber-500`

### Result
The progress tracker visually matches the Color Bar Setup Banner — unified amber ghost card styling across the entire setup experience.

