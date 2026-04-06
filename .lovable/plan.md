

# Move Level Name to Expanded Details Section

## Change

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

1. **Remove the inline rename mode from the collapsed row** (lines 1181-1206). The collapsed row should always show the level name as static text — no more pencil icon triggering an inline input that replaces the name in the header.

2. **Remove the pencil (edit) button** from the actions column (lines 1226-1231). The expand/collapse chevron is sufficient to access editing.

3. **Add a "Level Name" input field** as the first field in the expanded details section (after the "Details" label, before the description input). This makes the name editable alongside description and commission fields in a consistent form layout.

4. **Auto-expand on click anywhere on the row** (already works via `toggleExpanded`). Since editing is now always in the expanded section, no separate `editingIndex` state is needed for the header — simplify by removing the `editingIndex === index` conditional in the header grid.

5. **Clean up `editingIndex` usage** — it may still be needed for other purposes (like auto-expanding when adding), but the header row no longer branches on it. The Col 6 actions column always renders (no more `editingIndex !== index` guard hiding it).

**Result:** Clicking a row expands it to show Level Name, Description, Commission fields, and Criteria — all editable in one place. The collapsed row stays clean with just the badge, name, commission percentages, stylist count, delete, and chevron.

**1 file changed. No database changes.**

