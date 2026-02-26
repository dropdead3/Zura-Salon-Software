

## Increase Border/Separator Visibility Across Dashboard Cards

The borders and separator lines inside cards are nearly invisible because the dark mode `--border` CSS variable is set to `0 0% 26%` (very dark gray on a 4% black background), and most components further reduce it with opacity modifiers like `border-border/30` and `border-border/40`.

### Root Cause
- `--border` in dark cream theme: `0 0% 26%` — only 22% contrast against the 11% card background
- Many components apply `/20`, `/30`, `/40` opacity modifiers, making borders nearly invisible

### Fix: Increase `--border` lightness in dark mode

**File: `src/index.css`** — line 249

```css
/* Current */
--border: 0 0% 26%;

/* Change to */
--border: 0 0% 34%;
```

This single change increases border visibility across every card, separator, and divider in the dashboard without touching any component files. The 34% lightness gives a clear but still subtle separation against the 11% card surface — visible at a glance without being harsh.

The same adjustment should be applied to the other dark theme variants for consistency:

- **Dark Rose** (line 372): `350 10% 28%` → `350 10% 36%`
- **Dark Sage** (line 495): `145 8% 28%` → `145 8% 36%`
- **Dark Ocean** (if present): same pattern

This is a single-variable fix that propagates to all 86+ files using `border-border` classes.

