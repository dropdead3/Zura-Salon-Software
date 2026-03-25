

## Add Formula History Notes to the Notes Tab, Organized by Appointment Date

### Problem
The Notes tab only shows Booking Note, Profile Notes, and Team Notes. The formula history entries (from `DEMO_FORMULA_HISTORY` / `useClientFormulaHistory`) contain rich notes like "Level 7 base maintained, added 7/1 for dimension" that aren't surfaced here. These should appear organized by past appointment date.

### Design
Add a new **"Formulation Notes"** section below Profile Notes and above Team Notes. It pulls data from `useClientFormulaHistory` using the client ID, groups entries by appointment date, and renders them chronologically (newest first). Each entry shows:
- Date header (e.g., "Mar 3, 2026")
- Service name + stylist
- Formula note text
- Ingredient chips (compact summary)

This gives the stylist a complete picture: booking context, client preferences, past formula decisions, and team communication — all in one tab.

### Changes

**`src/components/dock/appointment/DockNotesTab.tsx`**

1. **Import** `useClientFormulaHistory` and `format`/`parseISO` from date-fns (format already imported)
2. **Fetch formula history** using `useClientFormulaHistory(clientId || phorestClientId)` — the hook already handles demo IDs
3. **New section** "Formulation Notes" between Profile Notes and Team Notes:
   - Each formula entry rendered as a card with:
     - Date + service name header row
     - Stylist name (muted)
     - Formula note in italics
     - Small ingredient chips (product name + quantity)
   - Grouped/sorted by `created_at` descending (already sorted from hook)
   - Empty state hidden if no formulas exist
4. Update `hasAnyContent` check to include formula history

### One file changed
`src/components/dock/appointment/DockNotesTab.tsx`

