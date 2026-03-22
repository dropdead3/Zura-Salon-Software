

## Reduce Header Crowding in Dock Schedule Tab

**Problem:** The top section (title, date, + button, toggle) feels cramped — elements are packed tightly with minimal vertical breathing room between them.

### Changes — `src/components/dock/schedule/DockScheduleTab.tsx`

1. **Increase header vertical padding:** `pt-8 pb-3` → `pt-8 pb-5` (line 194) — more space below the title/date before the toggle row

2. **Add spacing between date and toggle:** Insert a subtle separator or simply increase the toggle row's top padding: `pb-4` → `pt-2 pb-5` (line 212) — gives the toggle row its own breathing room above and below

3. **Add a thin divider** between the header block and the toggle row using a `border-b border-[hsl(var(--platform-border)/0.15)]` on the header container, visually separating the title area from the filter controls

**Result:** The top section goes from 3 tightly stacked rows to a more breathable layout with clear separation between the title area and the filter toggle, before the appointment list begins.

Single file, padding/border class adjustments only.

