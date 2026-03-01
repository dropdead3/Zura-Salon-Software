

## Fix Daily Operating Average Badge for Light/Dark Mode

### Problem
The badge in both `WeekAheadForecast.tsx` and `ForecastingCard.tsx` uses hardcoded dark-mode-optimized colors:
- Text: `rgb(254 240 138)` (pale yellow -- invisible on light backgrounds)
- Background: `linear-gradient(... rgb(133 77 14 / 0.5) ...)` (dark amber -- muddy on cream)
- Border: `rgb(202 138 4 / 0.6)` (dark gold)

These render poorly against light chart backgrounds.

### Proposed Approach
Replace hardcoded colors with **theme-aware CSS variable expressions** that resolve differently in light vs dark mode. The badge will use the existing `oat` / `gold` semantic tokens from the design system for light mode, and retain the current warm amber aesthetic for dark mode.

**Light mode style:**
- Background: Warm oat/cream gradient with slight gold tint (`hsl(var(--oat))` at low opacity) -- subtle, elegant, executive
- Text: Rich amber-brown (`hsl(35 80% 35%)`) -- high contrast on cream, warm tone
- Border: Gold at moderate opacity -- refined accent line

**Dark mode style:**
- Retain current amber/gold palette (it works well on dark)

### Files to Change (2)

**1. `src/components/dashboard/sales/WeekAheadForecast.tsx` (~line 581-594)**
Replace the hardcoded inline style object with a helper that returns light or dark palette based on the resolved theme from `useDashboardTheme()`.

**2. `src/components/dashboard/sales/ForecastingCard.tsx` (~line 957-971)**
Same change -- use the theme-aware style helper for the badge.

### Implementation Detail
Create a small shared helper (or inline in each file) that reads the current theme:

```text
Light mode badge:
  background: hsl(40 40% 94% / 0.85)  (warm cream, semi-transparent)
  border: 1px solid hsl(35 60% 60% / 0.5)  (warm gold outline)
  color: hsl(35 70% 30%)  (deep amber-brown text)
  backdrop-filter: blur(6px)

Dark mode badge:
  (keep existing amber/gold styling)
```

The dashed reference line color will also be adjusted: warm gold in light mode (`hsl(35 60% 55% / 0.4)`) vs current amber in dark.

Both components already have access to the theme context or can import it with minimal overhead.

