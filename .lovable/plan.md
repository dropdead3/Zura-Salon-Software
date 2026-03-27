

## Responsive Recomposition — Service Tracking Section

### Scope
Transform `ServiceTrackingSection.tsx` from a table-based layout into a breakpoint-aware, recomposed UI that feels native on iPad, mobile, and desktop. Uses container queries (`@container`) for all breakpoints since this component lives inside a sidebar-constrained layout.

### Breakpoint Strategy (Container Queries)
- **Desktop** (`@[900px]+`): Full table layout (current)
- **Tablet** (`@[500px]–@[899px]`): Card-list hybrid — rows become compact cards, drill-downs remain inline
- **Mobile** (`<@[500px]`): Full card blocks, drill-downs open as full-width panels, sticky action bar

---

### 1. Card Header & Controls Collapse

**Current**: Card header has title/icon left, "Track Selected" + "Services Configurator" buttons right. Filter pills + search below.

**Tablet/Mobile recomposition**:
- Title + icon remain
- "Services Configurator" button → icon-only (`ArrowRight` with tooltip) at `<@[700px]`
- "Track Selected" stays visible (primary action)
- Filter pills: wrap naturally (already `flex-wrap`) — good
- Search input: full-width on mobile, right-aligned on desktop (already `sm:w-56`)
- Auto-detect banner: stack button below text at `<@[500px]`

### 2. Table → Card Transformation

**Current**: `<Table>` with columns: Checkbox | Service | Billing Toggle | Chevron

**Desktop (`@[900px]+`)**: Keep current table layout unchanged.

**Tablet/Mobile (`<@[900px]`)**: Replace table with card-list:
- Each **category group header** becomes a full-width divider bar (same collapsible behavior)
- Each **service row** becomes a card block:
  ```
  ┌─────────────────────────────────────┐
  │ [●/☐]  Service Name          [▼]   │
  │        Category · Configured ✓      │
  │        $XX Allowance · Parts & Labor│
  └─────────────────────────────────────┘
  ```
  - Checkbox/dot + service name + chevron on one line
  - Badges wrap below on second line
  - Billing toggle hidden (moved into drill-down, already done via `@[600px]`)
  - Min touch target: 48px row height
  - `gap-3` between cards for breathing room

### 3. Drill-Down / Expanded Content Recomposition

**Current**: Expanded detail uses `motion.tr` with `colSpan={4}`, contains a 2-column grid (`xl:grid-cols-2`) for Tracking + Billing sections.

**Desktop**: Keep inline expansion (current behavior).

**Tablet (`@[500px]–@[899px]`)**: 
- Expand inline but force single-column stack (`grid-cols-1` always)
- Tracking and Billing sections get full width
- Allowance CTA card gets full width

**Mobile (`<@[500px]`)**:
- Same inline expansion but with increased padding
- "Configure Allowance" CTA becomes full-width button
- "Finalize Configuration" footer stacks vertically (hint text above, buttons below)
- Edit/Reset buttons get 44px min touch targets

### 4. Billing Method Section Recomposition

**Current**: Billing mode toggles ("Allowance" / "Parts & Labor") are inline pill buttons with "or" separator.

**Mobile**: 
- Stack vertically if container < 500px: each pill becomes full-width
- Remove "or" text, use vertical gap instead
- Allowance detail text wraps naturally (already does)

### 5. Finalize Footer Recomposition

**Current**: Horizontal `flex justify-between` with hint text left, buttons right.

**Mobile (`<@[500px]`)**:
- Stack: hint text on top, buttons below
- Buttons use full-width or at least larger touch targets (h-9 instead of h-7)
- "Reset" and "Finalize" get more spacing between them

### 6. Sticky Action Bar (Mobile)

When services are selected (bulk track mode), show a **sticky bottom bar** at `<@[600px]`:
- Fixed at bottom of the card container
- Shows: "X selected" + "Track Selected" button
- `bg-card border-t shadow-lg` for visual separation
- Replaces the header-level "Track Selected" button at narrow widths

### 7. Typography & Spacing Adjustments

- Category group headers: current `text-[11px]` is fine
- Service names: `text-sm` stays, allow 2-line wrap (remove `truncate` at `<@[600px]`)
- Badge text: `text-[10px]` stays
- Card padding: increase from `py-2` to `py-3` at `<@[600px]` for touch targets
- Expanded detail padding: `px-4 py-4` instead of `px-6 py-4` at `<@[500px]`

### 8. Progress Bar (Top)

The `ServiceTrackingProgressBar` is already responsive. No changes needed.

---

### Implementation Approach

All changes in a single file: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`

1. The outer `@container` wrapper already exists on the table div — extend it to wrap the entire card content area
2. Create a `ServiceCardRow` inline sub-component for the mobile card rendering
3. Use conditional rendering based on a container query CSS approach:
   - Table block: `hidden @[900px]:block`
   - Card list block: `@[900px]:hidden`
4. Both render the same data, share the same expand/toggle/select handlers
5. Keep `motion.tr` for table mode; use `motion.div` for card mode expansions

### Files Modified
- `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx` — all changes

