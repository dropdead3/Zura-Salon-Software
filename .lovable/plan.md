

## Redesign Edit Services Sheet: Category-First Drill-Down with iPad-Sized Touch Targets

### Problem
The current Edit Services sheet dumps all services in one scrollable list. On an iPad in a salon, it's too small and hard to scan quickly. A category-first approach lets stylists tap their category first, then see only the relevant services — faster, less scrolling, bigger targets.

### Design
Two-phase UI within the same sheet:

1. **Category grid** (default view): Large tappable cards for each category (e.g., "Blonding", "Color", "Add Ons", "Cuts & Style"). Each card shows the category name + service count. Tapping drills into that category's services.

2. **Service list** (after selecting a category): Back button at top to return to categories, category name as header, then the service list with larger rows (py-4 instead of py-2.5), bigger checkboxes (w-6 h-6), larger text (text-base instead of text-sm).

The "On This Appointment" chips and search bar stay at the top always. When searching, skip the category view and show filtered results directly (current behavior).

### Changes — 1 file

**`src/components/dock/appointment/DockEditServicesSheet.tsx`**

- Add `activeCategory` state (`string | null`) — `null` = show category grid, set = show services
- **Category grid**: Render when `activeCategory === null && !search.trim()`
  - 2-column CSS grid of category cards
  - Each card: `rounded-xl`, `min-h-[80px]`, `p-5`, category name in `text-base font-display uppercase tracking-wider`, service count badge, selected count indicator if any services from that category are already selected
  - Tap → `setActiveCategory(cat)`
- **Service list**: Render when `activeCategory` is set or search is active
  - Back arrow button (ChevronLeft) + category name header when drilling in
  - Increase all touch targets:
    - Row padding: `py-4 px-4` (up from `py-2.5 px-3`)
    - Checkbox: `w-6 h-6 rounded-lg` (up from `w-5 h-5 rounded-md`)
    - Check icon: `h-4 w-4` (up from `h-3 w-3`)
    - Service name: `text-base` (up from `text-sm`)
    - Duration/price: `text-sm` (up from `text-xs`)
  - Only show services for `activeCategory` (or all if searching)
- **Selected chips**: Increase chip size — `px-3.5 py-1.5 text-sm rounded-xl` (up from `px-2.5 py-1 text-xs rounded-lg`), X icon `h-4 w-4`
- **Footer**: Increase button height `h-12 px-8 text-base` (up from `h-9 px-7 text-sm`), summary text `text-base`
- **Search input**: Increase height to `h-12` with `text-base`

### Interaction flow
1. Open sheet → see "On This Appointment" chips + category grid
2. Tap "Blonding" → see Blonding services with back button
3. Check/uncheck services → chip area updates
4. Tap back → return to category grid
5. Or type in search → instantly shows filtered flat list across all categories

