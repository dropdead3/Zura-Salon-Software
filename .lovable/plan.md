

## Fix: Section Headers Must Use Termina (`font-display`)

You're right, and I appreciate the consistency enforcement. The rule is clear: **all uppercase labels must use `font-display` (Termina)**. These four section headers are using `uppercase` with the default `font-sans` (Aeonik Pro), which violates the design system.

### What's Wrong

All section headers in the Tips Drilldown use this class string:
```
text-xs tracking-wide uppercase text-muted-foreground font-medium
```

Missing: `font-display`. Without it, the text renders in Aeonik Pro (the sans default), which should never be uppercased per the typography rules.

### Files & Lines to Fix

**`src/components/dashboard/sales/TipsDrilldownPanel.tsx`** — 4 occurrences:

| Line | Header Text | Fix |
|---|---|---|
| 207 | "Tips by Service Category" (self-view) | Add `font-display` |
| 260 | "Tips by Stylist" | Add `font-display` |
| 290 | "Avg Tip Rate Ranking" | Add `font-display` |
| 340 | "Tips by Service Category" (leadership view) | Add `font-display` |

**`src/components/dashboard/sales/TipPaymentMethodBreakdown.tsx`** — 1 occurrence:

| Line | Header Text | Fix |
|---|---|---|
| 45 | "Tips by Payment Method" | Add `font-display` |

### The Change

Each `<span>` goes from:
```
text-xs tracking-wide uppercase text-muted-foreground font-medium
```
To:
```
font-display text-xs tracking-wide uppercase text-muted-foreground font-medium
```

5 one-word additions across 2 files. No structural changes.

