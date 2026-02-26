

## Polish Zura Insights Panel: Better Space Utilization and Bento Layout

### Current Issues (from screenshot)
- Single-column stacked list wastes horizontal space on wide screens
- Insight cards are visually uniform — no hierarchy between critical vs info severity
- Summary area at top is text-heavy, not scannable
- No visual density differentiation — all cards same size regardless of importance
- Footer feels disconnected
- Tabs area could be more compact

### Changes

**File: `src/components/dashboard/AIInsightsDrawer.tsx`**

1. **Summary Header Redesign**
   - Replace text-only summary with a compact glass strip: sentiment icon + summary line + metadata (updated time) all in one row
   - Move refresh/close buttons inline with title row (already done, keep)
   - Add a subtle severity count bar: colored dots showing count of critical/warning/info items at a glance

2. **Insight Cards → 2-Column Bento Grid**
   - On `lg+` screens, render insight cards in a 2-column CSS grid (`grid grid-cols-1 lg:grid-cols-2 gap-3`)
   - Critical severity cards span full width (`lg:col-span-2`) to draw attention
   - Warning and info cards flow naturally into the 2-col grid
   - Each card gets a left-edge severity accent bar (3px colored left border: red for critical, amber for warning, blue/muted for info)

3. **InsightCard Visual Hierarchy**
   - Critical cards: subtle red-tinted background (`bg-red-500/5`), thicker left accent, slightly larger title
   - Warning cards: amber tint (`bg-amber-500/5`)
   - Info cards: neutral (current styling)
   - Category eyebrow + icon stay but get tighter spacing

4. **Action Items Tab**
   - Use a numbered compact list with priority pills right-aligned
   - Add alternating subtle row backgrounds for scannability

5. **Panel Container**
   - Inner padding increase from `p-4` to `p-5` for breathing room
   - Reduce max-h from `65vh` to `60vh` to keep it contained
   - Add subtle inner shadow at scroll edges (top/bottom fade indicators via pseudo-elements)

6. **Footer**
   - Make footer stickier and more minimal — just the "Powered by" line with no extra padding

### Layout Structure (After)
```text
┌─────────────────────────────────────────────────────────────┐
│ ZURA BUSINESS INSIGHTS                    [↻] [✕]          │
│                                                             │
│ ⚠ Summary line here...              Updated 5m ago         │
│ ●●● 2 critical · 1 warning · 1 info                        │
│                                                             │
│ [  Key Insights  |  Action Items  |  More suggestions  ]    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CRITICAL: Full-width card spanning both columns         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────┐  ┌──────────────────────┐         │
│ │ WARNING card         │  │ INFO card            │         │
│ └──────────────────────┘  └──────────────────────┘         │
│ ┌──────────────────────┐  ┌──────────────────────┐         │
│ │ INFO card            │  │ INFO card            │         │
│ └──────────────────────┘  └──────────────────────┘         │
│                                                             │
│              Powered by Zura AI · Based on your data        │
└─────────────────────────────────────────────────────────────┘
```

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/AIInsightsDrawer.tsx` | Refactor panel layout: 2-col grid, severity hierarchy, summary strip, severity counts |

