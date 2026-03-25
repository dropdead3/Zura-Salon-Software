

## Make Service Table Responsive — No Horizontal Scroll

### Problem
The table has 8 columns (Checkbox, Status, Service, Category, Type, Tracked, Config, Actions) which overflows on smaller screens, causing a horizontal scrollbar.

### Solution
Consolidate the table into fewer columns on all screen sizes, moving secondary data into the expandable row (which already exists for tracked services). Extend expandability to **all** services, not just tracked ones.

### New Column Layout (4 visible columns)

| Column | Content |
|--------|---------|
| **Checkbox + Status** | Merge into one narrow column — checkbox (if untracked) or status dot |
| **Service** | Name + Category subtitle + Type badge inline |
| **Tracked** | Toggle switch |
| **Expand** | Chevron to drill down (always visible) |

### What Moves into the Expandable Row
- **Category** (shown as label, already visible as subtitle on the main row)
- **Type badge** (if not enough room, but we keep it inline)
- **Config status** icons (components mapped, allowance set)
- **Actions** ("Components" button)
- **Advanced toggles** (Asst Prep, Mix Assist, Formula Memory, Variance — already there for tracked services)

### Detailed Changes — `ServiceTrackingSection.tsx`

1. **Remove standalone columns**: Drop separate `Category`, `Type`, `Config`, and `Actions` `<TableHead>`/`<TableCell>` elements

2. **Merge into Service cell**: Show service name as primary text, category as a subtle subtitle below it, type badge inline after the name

3. **Always-expandable rows**: Move the `Collapsible` expand chevron to appear for **all** services (not just tracked). For untracked services the drill-down shows: category, type, and a prompt to enable tracking. For tracked services: existing config toggles + Components button + config status icons

4. **Reduce `colSpan`** on the expandable `<td>` from 8 to 4

5. **Update `TableHeader`** to only 4 columns: Checkbox, Service, Tracked, expand (no header label)

This eliminates horizontal overflow entirely while preserving all data via drill-down.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

