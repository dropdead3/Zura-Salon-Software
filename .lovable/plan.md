

## Add Animated Pointing Icon to "Finalize Configuration" Button

### Change
Add a bouncing arrow icon (e.g., `ArrowRight` or `ChevronRight`) to the left of the "Finalize Configuration" button that animates horizontally to draw attention to it.

### Technical Detail

**File: `ServiceTrackingSection.tsx`** (~lines 822–839)

Add a `ChevronRight` icon before the button text with a CSS animation that nudges it right repeatedly:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-7 text-xs shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
  onClick={...}
>
  <ChevronRight className="w-3.5 h-3.5 animate-[nudge-right_1s_ease-in-out_infinite]" />
  Finalize Configuration
</Button>
```

**File: `tailwind.config.ts`** — Add the `nudge-right` keyframe:

```ts
"nudge-right": {
  "0%, 100%": { transform: "translateX(0)" },
  "50%": { transform: "translateX(3px)" },
}
```

Animation: `"nudge-right": "nudge-right 1s ease-in-out infinite"`

This creates a subtle, continuous horizontal pulse on the chevron that draws the eye to the button without being distracting.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`
- `tailwind.config.ts`

