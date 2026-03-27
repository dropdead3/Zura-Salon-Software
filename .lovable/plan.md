

## Enhance Progress Card and Remove Outer Gray Card Wrapper

### Problem
The progress bar is wrapped in a generic `<Card>` + `<CardContent>` (lines 513–530 in ServiceTrackingSection.tsx) which creates a gray card container around the already amber-styled progress bar. This double-boxing looks wrong — the amber ghost card should be the only container.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines 512–530** — Remove the `<Card>` / `<CardContent>` wrapper. Render the progress bar and Quick Setup button directly inside a simple flex container:

```tsx
{/* Configuration Progress */}
<div className="flex items-center gap-3">
  <div className="flex-1">
    <ServiceTrackingProgressBar milestones={milestones} />
  </div>
  <Button
    variant="outline"
    size="sm"
    className="shrink-0"
    onClick={() => setWizardOpen(true)}
  >
    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
    Quick Setup
  </Button>
</div>
```

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingProgressBar.tsx`**

Visual enhancements to the amber ghost card:

1. **Overall progress bar** — Increase height from `h-1.5` to `h-2` and add `bg-amber-500/20` track background for better contrast
2. **Completed rows** — Add slight padding bump (`py-2.5 px-4`) and font-medium on labels for better readability
3. **Remaining step progress bars** — Also bump to `h-1.5` with `bg-amber-500/20` track
4. **Section headers** — Bump from `text-[10px]` to `text-[11px]` for legibility, use `text-amber-600/60 dark:text-amber-400/40` to tie into the amber palette
5. **Quick Setup button alignment** — Move into the progress bar component's header row (right side of "Setup Progress" / "X of 3 complete") so it's visually integrated inside the amber card rather than floating outside

### Result
Single amber ghost card contains everything — progress header, milestones, and Quick Setup button. No outer gray card wrapper. Cleaner hierarchy and more polished appearance.

