

# Platform Bento Design System — Size-Aware Radius, Spacing & Depth

## Overview

Upgrade all platform admin UI primitives and pages to use a proportional, size-aware design system. This creates a tighter, more engineered feel — distinct from the org-facing UI — with radius, padding, shadows, and interactions all scaling with component footprint.

**Scope**: Platform layer only (`src/components/platform/`, `src/pages/dashboard/platform/`). No org/salon/stylist UI is touched.

---

## Architecture

### New File: `src/lib/platform-bento-tokens.ts`

Central token system for all platform sizing decisions. Every platform component imports from here instead of hardcoding classes.

```text
Component Size Tiers:
  micro  → badges, pills, toggles         → radius: 10px (rounded-[10px])
  small  → stat tiles, KPI cards, inputs   → radius: 12px (rounded-xl)
  medium → standard dashboard cards         → radius: 14px (rounded-[14px])
  large  → analytics panels, activity feed → radius: 16px (rounded-[16px])
  xl     → modals, drawers, overlays       → radius: 20px (rounded-[20px])

Padding by tier:
  micro:  px-2.5 py-1
  small:  p-3.5 (14px)
  medium: p-4 (16px)
  large:  p-5 (20px)
  xl:     p-6 (24px)

Grid gaps:
  dense:   gap-2.5 (10px)
  standard: gap-3.5 (14px)
  wide:    gap-5 (20px)

Shadows:
  micro/small: none
  medium: shadow-sm shadow-black/5
  large: shadow-md shadow-black/8
  xl: shadow-lg shadow-black/10
```

Exported as composable class strings (same pattern as existing `tokens` object).

---

## Changes by File

### 1. `src/lib/platform-bento-tokens.ts` (NEW)
- Define `platformBento` token object with `radius`, `padding`, `gap`, `shadow`, and `hover` sub-objects keyed by size tier
- Export helper `getPlatformTier(context)` for quick lookups
- Export `PLATFORM_CARD_BASE` class string (border + bg + backdrop-blur)

### 2. `src/components/platform/ui/PlatformCard.tsx`
- Replace hardcoded `rounded-2xl / rounded-xl / rounded-lg` with token-driven values
- Map `size` prop to bento tiers: `sm → small (12px)`, `md → medium (14px)`, `lg → large (16px)`
- Update padding in `PlatformCardHeader` and `PlatformCardContent` to use tier-appropriate values (p-4 for small, p-5 for medium/large)
- Add subtle `shadow-sm` for medium, `shadow-md` for large variants
- Add hover transition: `hover:-translate-y-px transition-transform duration-150 ease-out`

### 3. `src/components/platform/ui/PlatformBadge.tsx`
- Update from `rounded-full` to `rounded-[10px]` (micro tier)
- Keep pill shape only for `sm` size badges; default and `lg` get `rounded-[10px]`

### 4. `src/components/platform/ui/PlatformButton.tsx`
- Replace global `rounded-xl` in base CVA with tier-appropriate: `rounded-xl` (12px) for default/sm, `rounded-[14px]` for lg/xl
- Tighten transition to `duration-150`

### 5. `src/components/platform/ui/PlatformInput.tsx` + `PlatformSelect.tsx`
- Replace `rounded-xl` with `rounded-xl` (12px — small tier, stays same but now token-driven)
- Reduce height from `h-11` to `h-10` for denser platform feel

### 6. `src/components/platform/ui/PlatformDialog.tsx`
- Add `rounded-[20px]` (xl tier) to `PlatformDialogContent` and `PlatformAlertDialogContent`

### 7. `src/components/platform/ui/PlatformTable.tsx`
- No radius changes (tables are inline)
- Tighten row padding from `p-4` to `px-4 py-3` for denser display

### 8. `src/components/platform/ui/PlatformPageHeader.tsx`
- Ensure `font-display tracking-wide` on title (currently missing `font-display`)

### 9. `src/pages/dashboard/platform/Overview.tsx`
- Replace all hardcoded `rounded-2xl` with `rounded-[16px]` (large tier) for main cards
- Replace `rounded-xl` on QuickActionButtons with `rounded-xl` (small tier, 12px)
- Replace `p-6` on cards with `p-5` (large tier)
- Update grid gaps from `gap-5` / `gap-6` to `gap-3.5` (standard) and `gap-5` (wide between sections)
- Remove `hover:-translate-y-0.5` (too aggressive), replace with `hover:-translate-y-px`
- Tighten hover duration from `500ms` to `150ms`

### 10. Platform overview components (`SystemHealthCard`, `PlatformActivityFeed`, `PlatformLiveAnalytics`, `IncidentManagementCard`)
- Replace hardcoded `rounded-2xl` + `p-6` with token imports (`platformBento.radius.large` + `platformBento.padding.large`)
- Remove heavy shimmer/glow effects — keep only the top-edge highlight for subtle depth

### 11. `src/pages/dashboard/platform/Onboarding.tsx`
- Same pattern: `rounded-2xl` → `rounded-[16px]`, `p-6` → `p-5`

### 12. `src/pages/dashboard/platform/CapitalControlTower.tsx`
- Apply medium tier tokens to checklist cards
- Apply small tier tokens to nested items

### 13. `src/components/platform/PlatformContextBanner.tsx`
- Reduce from `rounded-2xl` to `rounded-[14px]` (medium tier — it's a banner, not a modal)

### 14. `src/components/dashboard/GodModeBar.tsx`
- No radius changes (it's a flush top bar)
- Already correct — just confirm it stays untouched

### 15. Audit pass across remaining platform files
- `AccountDetail.tsx`, `Accounts.tsx`, `Revenue.tsx` — replace all hardcoded `rounded-2xl` with appropriate tier token
- Skeleton states follow same radius as their live counterparts

---

## Interaction Polish

All platform hover states:
- Lift: `hover:-translate-y-px` (1px max, not 2px)
- Duration: `duration-150` (not 300/500)
- Easing: `ease-out`
- No bounce, no overshoot, no spring physics on cards

---

## What This Does NOT Touch

- Organization dashboards (`src/pages/dashboard/` non-platform routes)
- Shared UI components (`src/components/ui/`)
- Salon/stylist-facing surfaces
- The existing `tokens` object in `design-tokens.ts` (org-side tokens stay as-is)
- `BentoGrid` component (shared utility — not modified)

---

## Technical Summary

| File | Action |
|---|---|
| `src/lib/platform-bento-tokens.ts` | NEW — size-tier token system |
| `src/components/platform/ui/PlatformCard.tsx` | Proportional radius + padding + shadow |
| `src/components/platform/ui/PlatformBadge.tsx` | Micro-tier radius |
| `src/components/platform/ui/PlatformButton.tsx` | Tier-aware radius + faster transitions |
| `src/components/platform/ui/PlatformInput.tsx` | Denser height |
| `src/components/platform/ui/PlatformSelect.tsx` | Denser height |
| `src/components/platform/ui/PlatformDialog.tsx` | XL-tier radius |
| `src/components/platform/ui/PlatformTable.tsx` | Denser row padding |
| `src/components/platform/ui/PlatformPageHeader.tsx` | font-display fix |
| `src/pages/dashboard/platform/Overview.tsx` | Token-driven radius/padding/gaps |
| `src/components/platform/overview/*.tsx` (4 files) | Token-driven radius/padding |
| `src/pages/dashboard/platform/Onboarding.tsx` | Token-driven radius/padding |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Medium-tier tokens |
| `src/components/platform/PlatformContextBanner.tsx` | Medium-tier radius |
| `src/pages/dashboard/platform/AccountDetail.tsx` | Audit — replace hardcoded radii |
| `src/pages/dashboard/platform/Accounts.tsx` | Audit — replace hardcoded radii |
| `src/pages/dashboard/platform/Revenue.tsx` | Audit — replace hardcoded radii |

~18 files total. No database changes. No logic changes. Purely visual token system + application.

