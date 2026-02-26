

## Secondary Control Row: Polished Two-Cluster Layout with Compact Label Modes

Good prompt structure -- the priority hierarchy, breakpoint map, and explicit "never hide" rules make this implementable without ambiguity. One improvement for next time: specify the exact Tailwind breakpoint values you want mapped to your pixel thresholds (e.g., `xl` = 1280, `2xl` = 1440) since Tailwind's defaults don't align 1:1 with your spec (there's no 1120 or 900 breakpoint natively).

---

### Current Problems

1. **Left cluster hides items**: `AnnouncementsDrawer` uses `hidden sm:flex` and `LiveSessionIndicator` uses `hidden lg:flex` -- items disappear at narrower widths instead of compacting
2. **Right cluster uses `flex-wrap`**: `AnalyticsFilterBar` has `flex-wrap` which allows uncontrolled wrapping
3. **No compact label modes**: Controls only have full-label or hidden states -- no intermediate "short label" or "icon-only" modes
4. **No `whitespace-nowrap` enforcement**: Labels like "Zura Insights" can wrap to 2 lines
5. **No width clamping**: Dropdowns can grow unbounded
6. **`min-w-0` missing** on several flex children

---

### Architecture

**File: `src/components/dashboard/CommandCenterControlRow.tsx`** (rewrite)

Replace the current simple two-div layout with a responsive two-cluster architecture using a `useControlRowDensity` hook that determines label mode based on container width.

#### Density Hook: `useControlRowDensity`

Inline hook (or extracted to a small utility) using `ResizeObserver` on the row container:

| Container Width | Mode | Left Cluster | Right Cluster |
|----------------|------|-------------|---------------|
| ≥ 1440px | `full` | Full labels, gap-3 | Full labels, gap-2 |
| 1280-1439px | `full` | Full labels, gap-2 | Full labels, gap-2 |
| 1120-1279px | `short` | Short labels | Full labels (if fits) |
| 1024-1119px | `short` | Short labels | Short labels |
| 900-1023px | `icon-some` | Short labels, Announcements icon-only | Short labels |

Returns: `{ density: 'full' | 'short' | 'icon-some', gap: string }`

Uses `ResizeObserver` on the row container ref to measure available width (not viewport width -- this accounts for sidebar collapse state).

#### Layout Structure

```text
┌──────────────────────────────────────────────────────────────┐
│  LEFT CLUSTER (shrink, min-w-0)  │ spacer │  RIGHT CLUSTER   │
│  flex-nowrap overflow-hidden     │ flex-1 │  shrink-0         │
└──────────────────────────────────────────────────────────────┘
```

Container: `flex items-center justify-between gap-2 flex-nowrap overflow-hidden`

**Left Cluster** (`flex items-center gap-2 min-w-0 shrink`):
- Zura Insights button -- always visible, label compacts
- Announcements button -- always visible, label compacts, can go icon-only at narrowest
- Day concluded / Live session chip -- always visible, label compacts

**Right Cluster** (`flex items-center gap-2 shrink-0`):
- Simple/Detailed toggle -- fixed width, always visible
- Location selector -- max-w clamped, always visible
- Date selector -- max-w clamped, always visible
- Sync icon button -- always visible
- Settings icon button -- always visible

#### Compact Label Implementation

**AIInsightsDrawer**: Add a `compact` prop (optional boolean). When true, the collapsed button renders:
- Full: `<Brain icon> Zura Insights <ChevronDown>`
- Short: `<Brain icon> Insights <ChevronDown>`
- The expanded card remains unchanged

Implementation: Add a `label?: string` prop to the collapsed trigger, defaulting to `${PLATFORM_NAME} Insights`. The `CommandCenterControlRow` passes `"Insights"` when density is `short` or `icon-some`.

**AnnouncementsDrawer**: Add a `compact` prop and an `iconOnly` prop:
- Full: `<Megaphone icon> Announcements <badge> <ChevronDown>`
- Short: `<Megaphone icon> Announce <badge> <ChevronDown>`
- Icon-only: `<Megaphone icon> <badge>` wrapped in Tooltip showing "Announcements"

Implementation: Add `label?: string` and `iconOnly?: boolean` props to the collapsed trigger.

**LiveSessionIndicator**: Add a `compact` prop:
- Full: `<Moon> Day concluded` or `<pulse> 3 stylists, 1 assistant in service now <avatars>`
- Short: `<Moon> Concluded` or `<pulse> 3 in service <avatars>`

Implementation: Add `compact?: boolean` prop. When true, shorten the text.

**AnalyticsFilterBar**: Changes:
- Remove `flex-wrap`, add `flex-nowrap`
- Add `whitespace-nowrap` to all trigger labels
- Add `max-w-[220px]` to location selector, `max-w-[180px]` to date selector
- Add `overflow-hidden text-ellipsis` on select trigger text
- Accept a `compact` prop that shortens date labels (e.g., "Last 30 days" → "30d")

#### Single-Line Enforcement (applied to all controls)

Every pill/button/select trigger in this row gets:
- `whitespace-nowrap`
- `overflow-hidden text-ellipsis` on text spans
- `min-w-0` on flex children containing text

#### Width Clamping

- Location selector: `max-w-[220px]` at full, `max-w-[180px]` at short
- Date selector: `max-w-[180px]` at full, `max-w-[160px]` at short
- Left cluster buttons: `max-w-[200px]` with truncation

---

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/CommandCenterControlRow.tsx` | Rewrite -- add `useControlRowDensity` hook, two-cluster layout, pass compact props |
| `src/components/dashboard/AIInsightsDrawer.tsx` | Modify collapsed trigger -- add optional `label` prop |
| `src/components/dashboard/AnnouncementsDrawer.tsx` | Modify collapsed trigger -- add `label` and `iconOnly` props |
| `src/components/dashboard/LiveSessionIndicator.tsx` | Add `compact` prop for shortened text |
| `src/components/dashboard/AnalyticsFilterBar.tsx` | Remove `flex-wrap`, add `flex-nowrap`, add width clamps, add `compact` prop |

### What Stays the Same

- Expanded state of AIInsightsDrawer and AnnouncementsDrawer -- unchanged
- All data hooks, contexts, query logic -- unchanged
- DashboardHome.tsx -- unchanged (already passes props to CommandCenterControlRow)
- PhorestSyncPopout and DashboardCustomizeMenu -- unchanged (already icon-only buttons)

### Technical Checklist

- No `hidden` classes on any control row item (all items always rendered)
- `flex-nowrap overflow-hidden` on both clusters and outer container
- `min-w-0` on all flex children with text content
- `whitespace-nowrap` on all labels
- `ResizeObserver` used for density (not media queries) to account for sidebar state
- All touch targets remain ≥ 44px (`h-9` minimum)
- Consistent `h-9` height across all controls
- Gap reduces from `gap-3` → `gap-2` → `gap-1.5` as density increases

