

## Goal
Layer three refinements onto the amber rebook alert: (1) risk-scaled amber intensity based on overdue drift, (2) one-shot entrance animation per checkout, (3) promote amber to a semantic `--warning` token.

## Why this matters
Aligns with doctrine: alerts intervene rarely, scale with materiality, and use semantic tokens — not palette literals. Right now amber is a flat literal applied uniformly regardless of risk; this makes it a tunable, theme-aware warning surface.

---

## Change 1 — Semantic `--warning` token

**File:** `src/index.css`

Add HSL warning variables alongside `--destructive` / `--success` (both light + dark + each theme block):
```css
--warning: 38 92% 50%;              /* amber-500 baseline */
--warning-foreground: 0 0% 100%;
--warning-soft: 38 92% 50%;         /* same hue, opacity applied at usage */
```

**File:** `tailwind.config.ts`

Register in the `colors` extend:
```ts
warning: {
  DEFAULT: 'hsl(var(--warning))',
  foreground: 'hsl(var(--warning-foreground))',
}
```

This gives us `text-warning`, `bg-warning`, `border-warning/40`, etc. — theme-aware and replaceable per palette in the future.

---

## Change 2 — Risk-scaled amber intensity

**File:** `src/components/dashboard/schedule/NextVisitRecommendation.tsx`

Accept (or derive) a `daysSinceLastVisit` + `recommendedIntervalDays` from existing recommender output. Compute a `driftRatio`:
```
driftRatio = daysSinceLastVisit / recommendedIntervalDays
```

Map to three intensity tiers (no continuous scale — keep it deterministic, three steps reads as decisive):

| Tier | driftRatio | Border | Background gradient | Pulse dot |
|------|------------|--------|---------------------|-----------|
| `on-cadence` | ≤ 1.0 | `border-warning/25 border-l-warning/60` | `from-warning/[0.05] to-warning/[0.02]` | static |
| `drifting` | 1.0–1.5 | `border-warning/40 border-l-warning` | `from-warning/[0.10] to-warning/[0.04]` | `animate-pulse` |
| `overdue` | > 1.5 | `border-warning/60 border-l-warning` + `shadow-[0_0_0_1px_hsl(var(--warning)/0.25),0_4px_16px_-2px_hsl(var(--warning)/0.25)]` | `from-warning/[0.16] to-warning/[0.06]` | `animate-pulse` + `ring-1 ring-warning/40` around dot |

Eyebrow copy adapts:
- on-cadence → `Say This`
- drifting → `Say This — Drifting`
- overdue → `Say This — Overdue`

Variables (`{selectedWeeks}`, `{dayLabel}`, `{timeLabel}`) stay `text-warning font-medium` across all tiers.

If drift data is missing, default to `drifting` (current visual baseline — no regression).

---

## Change 3 — One-shot entrance animation

**File:** `src/components/dashboard/schedule/NextVisitRecommendation.tsx`

Add a `useRef<boolean>(false)` flag + `useState` to gate animation to first mount only:
```tsx
const hasAnimated = useRef(false);
const [animateIn, setAnimateIn] = useState(!hasAnimated.current);

useEffect(() => {
  hasAnimated.current = true;
  const t = setTimeout(() => setAnimateIn(false), 300);
  return () => clearTimeout(t);
}, []);
```

Apply Tailwind's existing animation utilities (already in `tailwind.config.ts` per useful-context):
```tsx
className={cn(
  "...amber styles...",
  animateIn && "animate-[fade-in_0.25s_ease-out,scale-in_0.2s_ease-out]"
)}
```

Re-renders (interval toggle clicks) won't retrigger because the ref persists across renders within the same mount. New checkout sheet open = new mount = animation fires once.

---

## Token compliance
- `text-warning` / `bg-warning/X` are semantic tokens — no palette literals leak into JSX
- All weights ≤ `font-medium`
- Eyebrow stays `font-display` uppercase + tracking
- Shadow uses `hsl(var(--warning) / 0.25)` — theme-aware

## Files to change
1. `src/index.css` — add `--warning` HSL vars to `:root`, `.dark`, and each theme block
2. `tailwind.config.ts` — register `warning` color
3. `src/components/dashboard/schedule/NextVisitRecommendation.tsx` — drift tiering, swap amber-500 literals → `warning` token, one-shot entrance animation

## Out of scope
- Adding a 4th `critical` tier (>2.5x drift) — three tiers is enough signal; can add later if telemetry shows clustering above 2.5
- Per-stylist drift baselines (currently service-category baseline; personalization is a future wave)
- Logging which tier fired — telemetry hook can come with the rebook acceptance tracking already deferred

