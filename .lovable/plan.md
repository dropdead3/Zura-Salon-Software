

# Improve Level Cards UI + Move Add Level to Top

## Changes

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

### 1. Move "Add Level" button to the top
Move the `isAddingNew` block (lines 1348-1400) from below the levels list to above it — right after the quick stats row (line 1067). The inline input form for entering a new level name moves with it.

### 2. Replace dashed border button with a compact `+ Add Level` button
Instead of the full-width dashed border CTA, use a standard `Button` with `variant="outline"` and `size="sm"` placed inline in the stats row (next to "7 levels · 1 stylist assigned"). This is cleaner and saves vertical space.

```text
Before:
  7 levels · 1 stylist assigned
  [cards...]
  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  │      + Add Level           │
  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

After:
  7 levels · 1 stylist assigned          [+ Add Level]
  [inline input when adding...]
  [cards...]
```

### 3. UI polish for level rows
- Add `getLevelColor` color dot before the level number badge to provide visual hierarchy per the level-colors system
- Use `font-display` on level names for consistency with design tokens (currently `font-medium text-sm`)
- Reduce reorder arrow opacity to 40% default, 100% on card hover — less visual noise
- Add subtle left border accent using level color on expanded cards

### 4. Expanded content polish
- Add a section label "Details" with a thin divider when expanded
- Slightly increase left margin indentation for cleaner alignment

**1 file changed. No database changes.**

