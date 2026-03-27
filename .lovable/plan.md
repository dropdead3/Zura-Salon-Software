

## Command Center Customizer — Gap Analysis & Enhancements

### Current State
The customizer has four sections: Sections & Analytics (unified drag list), Quick Access Hubs, Widgets, and Available Analytics. It supports drag-to-reorder, toggle visibility, preview-on-hover for analytics cards, and reset-to-default.

### Identified Gaps

**1. Preview eye icon only on analytics cards — not on sections, widgets, or hubs**
Sections like "Client Engine", "Today's Prep", and "Quick Stats" have no preview. Users toggling these on/off have no way to know what they look like. The eye-hover preview pattern should extend to sections and widgets too.

**2. No confirmation on Reset to Default**
`handleResetToDefault` fires immediately — a misclick wipes the entire layout. Should use an `AlertDialog` confirmation.

**3. No category grouping in Available Analytics**
The 12 analytics cards have `category` metadata (Sales, Forecasting, Clients, Operations, Staffing) but the Available Analytics list renders them flat. Grouping by category would improve scannability.

**4. Disabled sections still have drag handles**
`SortableSectionItem` doesn't disable its drag handle when `isEnabled` is false, unlike `SortablePinnedCardItem` which does (`disabled={!isPinned}`). Disabled sections shouldn't be draggable.

**5. No search/filter in the customizer**
With 12+ analytics cards, 8 sections, 5 widgets, and multiple hubs, the list is long. A lightweight search input at the top would help users find items quickly.

**6. Widget drag doesn't persist full order**
`handleWidgetDragEnd` only saves the enabled subset to `layout.widgets`, losing the relative positions of disabled widgets on reload. Same pattern issue that was fixed for sections via `sectionOrder`.

**7. No "Select All / Deselect All" for analytics cards**
When onboarding or resetting, toggling 12 cards individually is tedious. Bulk actions would help.

**8. Preview cardId mismatch for pinned entries**
In the pinned list, `SortablePinnedCardItem` receives `id={itemId}` where `itemId` is a prefixed entry like `pinned:sales_overview`. The `AnalyticsCardPreview` receives this prefixed ID via `cardId={id}`, but the `PREVIEWS` map uses raw IDs like `sales_overview`. The preview silently returns `null` for all pinned cards — **the eye icon preview is broken for every pinned card**.

---

### Proposed Enhancements

**Fix 1 (Critical): Pass raw cardId to AnalyticsCardPreview**
In `SortablePinnedCardItem`, the `id` prop for pinned cards is `pinned:sales_overview` but `AnalyticsCardPreview` expects `sales_overview`. Extract the raw ID before passing to preview.

Two options:
- A) Add a `cardId` prop to `SortablePinnedCardItem` separate from the sortable `id`
- B) Strip the `pinned:` prefix inside the component using `getPinnedCardId`

Recommend option A for clarity — the parent already knows the raw card ID.

**Fix 2: Reset confirmation dialog**
Wrap "Reset to Default" button with `AlertDialog` — "This will restore all sections, widgets, and analytics to their default positions. Continue?"

**Fix 3: Disable drag handle on disabled sections**
Add `disabled={!isEnabled}` to the drag handle button in `SortableSectionItem`, matching the pattern already used in `SortablePinnedCardItem`.

**Enhancement 4: Category headers in Available Analytics**
Group `unpinnedCards` by `card.category` and render a small `text-[10px] text-muted-foreground` category label above each group.

**Enhancement 5: Search filter**
Add a small `CommandInput`-style search field at the top of the panel. Filter all items (sections, widgets, hubs, analytics) by label match. Only show when total item count exceeds 15.

**Enhancement 6: Widget order persistence**
Add a `widgetOrder` field to `dashboard_layout` (same pattern as `sectionOrder` and `hubOrder`) to track full ordering of all widgets regardless of enabled state.

**Enhancement 7: Bulk toggle for analytics**
Add "Pin All" / "Unpin All" text buttons in the Available Analytics header row.

### Priority Order
1. **Fix 1** — Preview is broken for pinned cards (critical bug)
2. **Fix 2** — Reset confirmation (data loss prevention)
3. **Fix 3** — Drag handle consistency
4. **Enhancement 4** — Category grouping
5. **Enhancement 5** — Search filter
6. **Enhancement 6** — Widget order persistence
7. **Enhancement 7** — Bulk toggle

### Technical Details

**Fix 1** requires adding a `cardId` prop:
```tsx
// SortablePinnedCardItem props
interface SortablePinnedCardItemProps {
  id: string;       // sortable ID (may be "pinned:xyz")
  cardId: string;   // raw card ID for preview lookup
  // ...
}
// Then: <AnalyticsCardPreview cardId={cardId} />
```

Parent passes it as:
```tsx
<SortablePinnedCardItem id={itemId} cardId={cardId} ... />
```

**Fix 2** uses existing `AlertDialog` component — no new dependencies.

**Enhancement 6** mirrors the existing `sectionOrder` pattern — stores `widgetOrder: string[]` in `dashboard_layout` JSON, merge on load with deduplication.

