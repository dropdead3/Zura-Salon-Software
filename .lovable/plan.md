

## Add "or" Separator Between Billing Method Pills

### Change

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines 915–960** — Replace the `.map()` over the two modes with explicit rendering of both buttons separated by an "or" label. Instead of mapping an array, render the Allowance button, then a `<span className="text-xs font-sans text-muted-foreground">or</span>`, then the Parts & Labor button.

This keeps the gap between elements consistent and adds a clear visual separator indicating these are mutually exclusive choices.

### Technical Detail

Replace the `{(['allowance', 'parts_and_labor'] as const).map(...)}` block with two explicit button blocks and an "or" span between them, reusing the same `onClick`/styling logic for each. The container `gap-1.5` may increase to `gap-2` for breathing room around the word.

### Result
The two billing options will read: `Billing: [✓ Allowance] or [+ Parts & Labor]` — making the mutual exclusivity immediately obvious.

