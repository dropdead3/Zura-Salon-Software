

# Hover Previews and Inline Analytics Cards — Command Surface

## Architecture Decision

**Right-side panel approach** — the dialog container expands from `max-w-[720px]` to `max-w-[1080px]` when a preview is active, with the results list taking ~55% and the preview panel taking ~45%. On screens below 1024px or mobile, previews render inline beneath the selected row instead. This avoids portal complexity and keeps the preview visually connected to the result.

## Files to Create

### 1. `src/components/command-surface/CommandPreviewPanel.tsx`
The right-side preview container. Receives the selected `RankedResult` and renders the appropriate entity preview card based on `result.type`.

- Fixed width `w-[340px]`, full height of the scroll area
- Border-left separator `border-l border-border/20`
- `bg-card-inner/50 backdrop-blur-sm`
- Smooth `animate-in fade-in-0 slide-in-from-right-2 duration-150`
- Contains a switch on `result.type` → renders the correct preview component
- Skeleton fallback while data loads
- Empty state: shows result title + subtitle + "Open to view details" — never blank

### 2. `src/components/command-surface/previews/ClientPreview.tsx`
Uses a **new lightweight hook** `useClientPreviewData(clientId)` that fetches from `clients` table with a single `.select()` — name, last_visit_date, total_spend, visit_count, is_vip, notes. Also fetches next upcoming appointment from `phorest_appointments` (1 row, future date, limit 1).

Layout:
- Name (font-display, text-base)
- VIP badge if applicable
- 4 KPI mini-tiles: Last Visit, Total Spend (BlurredAmount), Visits, Upcoming Appt
- Notes snippet (2 lines max, truncated)
- "Open Client Profile →" link at bottom

### 3. `src/components/command-surface/previews/TeamPreview.tsx`
Uses `useIndividualStaffReport(staffUserId)` — already exists and returns revenue, service count, etc. Cherry-pick the summary fields only.

Layout:
- Name + avatar placeholder
- 3 KPI tiles: Revenue (BlurredAmount), Utilization %, Rebooking Rate
- TrendSparkline for revenue (reuse existing component, width=200, height=32)
- "Open Stylist Profile →" link

### 4. `src/components/command-surface/previews/NavigationPreview.tsx`
For pages/features — no data fetch needed. Uses static metadata from nav config.

Layout:
- Page title
- 1-line description (from nav item subtitle or a static description map)
- "What you'll find here" — 2-3 bullet points (static, from a lookup)
- Keyboard shortcut if available

### 5. `src/components/command-surface/previews/ReportPreview.tsx`
For report-type results. Uses existing hooks based on report type (e.g., `useRetailAnalytics` summary, `useSalesMetrics`). Only fetches the headline metric + one sparkline.

Layout:
- Report name
- Headline metric (e.g., "$48,200 this month")
- TrendSparkline (reuse)
- "Open Report →"

### 6. `src/hooks/useClientPreviewData.ts`
Lightweight single-client fetch. Returns `{ client, nextAppointment, isLoading }`. Uses `staleTime: 60_000` to avoid refetching on rapid row changes. Query key includes client ID.

### 7. `src/hooks/useCommandPreview.ts`
Manages preview state: selected result, hover delay timer (120ms), and data resolution.

- `hoveredResult` state with 120ms debounce before committing to `activePreview`
- When `activePreview` changes, the preview panel re-renders
- Keyboard navigation (arrow keys) also updates `activePreview` immediately (no delay)
- Only one preview at a time
- Clears on query change

## Files to Edit

### 8. `src/components/command-surface/ZuraCommandSurface.tsx`
- Import `CommandPreviewPanel` and `useCommandPreview`
- Change the scroll area from single column to a `flex` row when preview is active (desktop only)
- Widen container: `max-w-[720px]` → `max-w-[720px] has-[.preview-panel]:max-w-[1080px]` (CSS-driven, or conditional class)
- Pass `onHover` callback to `CommandResultPanel` which propagates to rows
- Pass `selectedResult` to preview panel
- Add `transition-[max-width] duration-200 ease-out` for smooth width change
- Mobile: preview renders inline, no width change

### 9. `src/components/command-surface/CommandResultRow.tsx`
- Add `onMouseEnter` prop → calls `onHover(result)`
- Add `onFocus` prop → calls `onHover(result)` (keyboard a11y)
- No visual changes — hover/focus states already polished

### 10. `src/components/command-surface/CommandResultPanel.tsx`
- Accept and forward `onHover` callback to each `CommandResultRow`

## Inline Analytics Cards

### 11. `src/components/command-surface/CommandInlineAnalyticsCard.tsx`
Injected into result groups when the query matches a high-confidence analytics pattern (e.g., "retail", "revenue", "rebooking"). Rendered above the first result group.

- Max 1 card per query
- Uses existing hooks: `useSalesMetrics`, `useRetailAnalytics`, `useRebookingRate`
- Layout: compact card (h-20), icon left, metric center (BlurredAmount), trend right (TrendSparkline), CTA "View Report →"
- Matches `bg-card-inner/60 border border-border/30 rounded-lg mx-4 my-2`
- Pattern matching: map of query keywords → { hook, metric field, label, path }

### 12. `src/hooks/useSearchRanking.ts`
- Add `inlineAnalyticsHint` to ranking output — a simple `{ type: 'retail' | 'revenue' | 'rebooking' | null }` derived from parsed query intent + filter keywords
- Only emits when confidence is high (exact keyword match, not fuzzy)

## Trigger & Delay Logic

- **Mouse hover**: 120ms delay via `setTimeout`, cleared on mouse leave or new hover
- **Keyboard navigation**: Immediate (0ms) — user is actively browsing
- **Query change**: Clear active preview, reset timer
- **Mobile tap**: No preview panel; instead, selected row expands inline with a compact version

## Performance Strategy

- `staleTime: 60_000` on all preview queries — data doesn't need to be real-time
- Preview queries use `enabled: !!activePreviewId` — no fetch until needed
- Top 3 results prefetch their preview data after 300ms idle (background, low priority)
- Inline analytics card uses the same cached query as the dashboard — no duplicate fetches
- TrendSparkline is already `isAnimationActive={false}` — no render cost

## Permission Safety

- Client preview: respects `clients` table RLS (org-scoped)
- Team preview: `useIndividualStaffReport` already scoped to org
- Financial values: wrapped in `BlurredAmount` — honors hide-numbers toggle
- Inline analytics: same hooks as dashboard — RLS enforced

## Responsive Behavior

| Viewport | Preview Behavior |
|----------|-----------------|
| ≥1024px | Right-side panel, dialog widens |
| 768–1023px | Inline expansion below selected row |
| <768px | No preview (mobile full-screen search stays focused) |

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useCommandPreview.ts` | Create — hover delay, active preview state |
| `src/hooks/useClientPreviewData.ts` | Create — lightweight client fetch |
| `src/components/command-surface/CommandPreviewPanel.tsx` | Create — preview container + routing |
| `src/components/command-surface/previews/ClientPreview.tsx` | Create — client entity preview |
| `src/components/command-surface/previews/TeamPreview.tsx` | Create — stylist entity preview |
| `src/components/command-surface/previews/NavigationPreview.tsx` | Create — page description preview |
| `src/components/command-surface/previews/ReportPreview.tsx` | Create — metric + sparkline preview |
| `src/components/command-surface/CommandInlineAnalyticsCard.tsx` | Create — inline analytics card |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — integrate preview panel, widen container |
| `src/components/command-surface/CommandResultRow.tsx` | Edit — add onHover prop |
| `src/components/command-surface/CommandResultPanel.tsx` | Edit — forward onHover |
| `src/hooks/useSearchRanking.ts` | Edit — add inlineAnalyticsHint |

No database changes. No new design tokens.

