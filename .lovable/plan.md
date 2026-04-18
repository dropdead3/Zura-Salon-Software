

## Goal
Collapse the alert by default to show only the headline ("RETAIL HEALTH · CRITICAL"), let the user expand it to reveal the advisory copy, and reinforce the critical tier with a stronger red ghost treatment.

## Behavior
- **Collapsed (default)**: single row — icon + tier label only + chevron on the right
- **Expanded**: same row + advisory copy revealed below in same container
- Click anywhere on the row toggles expand/collapse
- State held locally with `useState`
- Chevron rotates (`ChevronDown` → 180°) on expand, with smooth transition

## Visual enhancements (critical "red ghost")
Tier-aware ghost intensity. Critical gets the strongest treatment; others stay calm.

| Tier | Border-l | Wash | Icon wrap | Label color |
|---|---|---|---|---|
| **critical** | `border-l-red-500` (full opacity, 4px) + subtle `ring-1 ring-red-500/20` | `bg-red-500/[0.07]` + `hover:bg-red-500/10` | `bg-red-500/15 ring-1 ring-red-500/30` | `text-red-500/90` (was muted) |
| soft | unchanged amber | unchanged | unchanged | unchanged |
| healthy | unchanged | unchanged | unchanged | unchanged |
| strong | unchanged emerald | unchanged | unchanged | unchanged |

The label "RETAIL HEALTH · CRITICAL" gets `text-red-500/90` only on critical tier so it reads as a notice, not muted background text. Other tiers keep `text-muted-foreground`.

## Interaction polish
- Row gets `cursor-pointer hover:bg-{tier}/[wash+0.03]` for affordance
- `aria-expanded` and `role="button"` + `tabIndex={0}` + Enter/Space keyboard handler for accessibility
- Expanded copy uses `animate-in fade-in slide-in-from-top-1 duration-200`
- Padding compresses when collapsed (`py-3` collapsed vs `p-4` expanded) to feel like a proper notice strip

## Layout sketch
```text
Collapsed:
┌─[red rail]─────────────────────────────────────┐
│  [⊘]  RETAIL HEALTH · CRITICAL          ⌄     │
└────────────────────────────────────────────────┘

Expanded:
┌─[red rail]─────────────────────────────────────┐
│  [⊘]  RETAIL HEALTH · CRITICAL          ⌃     │
│       Retail is a margin leak. Audit the       │
│       recommendation step in the service flow. │
└────────────────────────────────────────────────┘
```

## Out of scope
- Persisting expand state across navigations
- Per-tier default expand behavior (e.g., "critical opens by default") — keep collapsed default for all tiers; user discovers via headline
- Changing tier thresholds or copy

## Files
- **Modify**: `src/components/dashboard/sales/RetailPerformanceAlert.tsx` — add `useState` collapse, chevron, ghost treatment for critical, click/keyboard handlers

