

## Make "Configure Allowance" Button Obvious and Intuitive

### Problem
After selecting Allowance billing, the "Configure Allowance" button is a subtle dashed-outline button that blends in. Users don't realize it's the required next step before they can finalize. It needs to be a clear, prominent call-to-action.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines 1011–1029** — Replace the current subtle `variant="outline" border-dashed` button with a prominent amber CTA block:

1. **Amber action card** — Wrap in a small amber ghost container (`bg-amber-500/10 border border-amber-500/30 rounded-lg p-3`) to create visual weight and draw the eye
2. **Prominent button** — Use a solid amber button (`bg-amber-500 text-amber-950 hover:bg-amber-400`) instead of dashed outline, with an arrow icon to signal "go here next"
3. **Helper text** — Add a brief instruction line above or beside the button: "Set a product allowance for this service" so the user knows what they're configuring and why
4. **Pulsing dot or subtle animation** — Add a small pulsing amber dot next to the button text to draw attention without being aggressive

The result will look like a clear "next step" action card rather than a passive option.

### Technical Detail

```tsx
// Replace lines 1011-1029
return (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1.5">
    <p className="text-xs font-sans text-amber-700 dark:text-amber-300/80">
      Set a product allowance to calculate overage billing for this service.
    </p>
    <Button
      size="sm"
      className="h-8 text-xs bg-amber-500 text-amber-950 hover:bg-amber-400 font-sans gap-1.5"
      onClick={...}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-200" />
      </span>
      Configure Allowance
      <ArrowRight className="w-3 h-3" />
    </Button>
  </div>
);
```

### Result
When Allowance is selected but unconfigured, a visually distinct amber action card with a pulsing indicator makes it unmistakably clear that this button is the required next step.

