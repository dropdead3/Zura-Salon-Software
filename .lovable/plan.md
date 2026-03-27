

# Zura Insights: Redesign for Instant Clarity

## Problem
The current panel packs too much into a vertical scroll: summary strip, health strip, severity counts, lever, "One Thing Today", then tabs with a 2-column grid. It's dense and hard to scan quickly. Users can't choose which business areas they care about, and urgent items aren't visually separated from informational ones.

## Design Principles
- **Urgent first, optional later** — critical/warning items surface at the top in a dedicated "Needs Attention" section before any other content
- **Category filters** — let users toggle which business areas they want to see (Revenue, Retention, Capacity, Staffing, etc.) via pill-style filter chips
- **Scannable single-column layout** — remove the 2-column grid in favor of a clear vertical stack; each card is full-width with consistent structure
- **Flatten tabs** — merge "Key Insights" and "Action Items" into a single scrollable feed, with a view toggle (Insights / Actions / All) instead of hiding content behind tabs
- **Reduce chrome** — remove the health strip (redundant with severity dots), collapse severity counts into the header, and simplify the summary strip

## New Layout Structure

```text
┌─────────────────────────────────────────────────────┐
│  ZURA BUSINESS INSIGHTS          [Refresh] [Close]  │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🔮 Summary: "Revenue is healthy but 0% rebook  │ │
│  │    rate signals retention risk..."   · 2m ago   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ── NEEDS ATTENTION ─────────────────────────────── │
│  [Critical insight card - full width, red accent]    │
│  [Warning insight card - full width, amber accent]   │
│                                                      │
│  ── CATEGORY FILTERS ────────────────────────────── │
│  [$ Revenue ●] [♥ Retention ●] [~ Retail] [↗ Cap]  │
│                                                      │
│  ── VIEW ────────────────────────────────────────── │
│  ( All ) ( Insights ) ( Actions ) ( Suggestions )   │
│                                                      │
│  [Insight card - single column, full width]          │
│  [Insight card - single column, full width]          │
│  [Action item card]                                  │
│  ...                                                 │
│                                                      │
│  ── WEEKLY LEVER (collapsible) ─────────────────── │
│  [No KPIs configured → Build KPIs]                  │
│                                                      │
│  Powered by Zura AI · Based on your data            │
└─────────────────────────────────────────────────────┘
```

## Changes

### 1. Restructure `AIInsightsPanel` layout (src/components/dashboard/AIInsightsDrawer.tsx)

**Header:** Keep title + refresh/close. Move severity count dots inline with the title (e.g., "ZURA BUSINESS INSIGHTS · ● 1 ● 1 ● 1").

**Summary strip:** Keep as-is but remove the separate `BusinessHealthStrip` below it. The category filters replace its function.

**"Needs Attention" section (NEW):** Extract all `critical` and `warning` severity insights into a dedicated top section with a subtle label. These render as full-width cards with stronger visual accents. Always visible, not affected by category filters.

**Category filter chips (NEW):** Horizontal row of toggleable pill buttons — one per category (Revenue, Retention, Retail, Capacity, Staffing). Each shows a severity dot if that category has active insights. Multi-select; all active by default. Filters only the "info" severity insights below — urgent items always show above.

**View toggle:** Replace the 3-tab `Tabs` component with a simpler segmented control: All / Insights / Actions / Suggestions. "All" interleaves insights and action items by priority score.

**Content feed:** Single-column, full-width cards. Remove the `lg:grid-cols-2` grid. Each card is slightly more compact (reduce vertical padding). Remove the "One Thing Today" standalone card — the top critical/warning items in "Needs Attention" serve this purpose better.

**Weekly Lever:** Move to bottom of the panel, below the feed. Keeps collapsible behavior.

### 2. Add category filter state

Add `selectedCategories` state (Set of category keys) to `AIInsightsPanel`. Default: all selected. Filter `sortedInsights` by selected categories for the main feed only (not the "Needs Attention" section).

### 3. Remove `BusinessHealthStrip` component

No longer needed — category filters with severity dots replace it entirely.

### 4. Remove "One Thing Today" block

The "Needs Attention" section at the top replaces this. The highest-priority critical/warning insight is naturally the first card there.

## Files Changed
- **Modified:** `src/components/dashboard/AIInsightsDrawer.tsx` — restructure `AIInsightsPanel`, remove `BusinessHealthStrip`, add category filters, flatten to single-column, add "Needs Attention" section

No new files needed. This is a layout reorganization within the existing component.

