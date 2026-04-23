

# Add location filter to "View As → Team" tab (multi-location only)

## Diagnosis

The Team tab in `ViewAsPopover` lists every active employee across the organization with no way to narrow by location. For multi-location operators, this becomes a long flat list (your screenshot shows ~15+ stylists already, only 8 visible). The fix is a compact location filter that appears **only** when the org has 2+ active locations — single-location orgs see the current UI unchanged.

The data is already in place: `useAllUsersWithRoles()` returns `location_id` (primary) + `location_ids[]` (multi-assignment) on each user. We just need a location source and one extra filter step.

## Fix — single file, surgical

### `src/components/dashboard/ViewAsPopover.tsx`

**1. Pull active locations from the current org.**

```ts
import { useActiveLocations } from '@/hooks/useLocations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const { effectiveOrganization } = useOrganizationContext();
const { data: locations = [] } = useActiveLocations(effectiveOrganization?.id);
const showLocationFilter = locations.length >= 2;
const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
```

Single-location orgs (`locations.length < 2`): no filter renders, no behavioral change.

**2. Filter `filteredUsers` by location.**

Extend the existing `useMemo`:

```ts
const filteredUsers = useMemo(() => {
  const q = debouncedFilter.toLowerCase();
  return allUsers
    .filter(u => u.user_id !== user?.id)
    .filter(u => {
      if (selectedLocationId === 'all') return true;
      // Match against primary location_id OR location_ids[] array
      if (u.location_id === selectedLocationId) return true;
      if (u.location_ids?.includes(selectedLocationId)) return true;
      return false;
    })
    .filter(u => {
      if (!q) return true;
      const name = (u.display_name || u.full_name || '').toLowerCase();
      const roles = u.roles.join(' ').toLowerCase();
      return name.includes(q) || roles.includes(q);
    });
}, [allUsers, user?.id, debouncedFilter, selectedLocationId]);
```

Users with no location (`location_id = null` and empty `location_ids`) are hidden from per-location filters — they only appear in "All locations." This is correct: leadership/bookkeepers without a location pin should surface in the unfiltered view, not under a specific site.

**3. Render the filter as a compact pill row inside the existing sticky search header.**

Update the Team tab header block (currently `p-3 pb-2 shrink-0 border-b ...`):

```tsx
<div className="p-3 pb-2 shrink-0 border-b border-border/40 space-y-2">
  {/* Search input — unchanged */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
    <Input ... />
  </div>

  {/* Location pills — only when 2+ locations */}
  {showLocationFilter && (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
      <button
        onClick={() => setSelectedLocationId('all')}
        className={cn(
          'h-6 px-2.5 rounded-full text-[11px] font-sans transition-colors duration-150 shrink-0',
          selectedLocationId === 'all'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        )}
      >
        All locations
      </button>
      {locations.map(loc => (
        <button
          key={loc.id}
          onClick={() => setSelectedLocationId(loc.id)}
          className={cn(
            'h-6 px-2.5 rounded-full text-[11px] font-sans transition-colors duration-150 shrink-0',
            selectedLocationId === loc.id
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          {loc.name}
        </button>
      ))}
    </div>
  )}
</div>
```

Pattern matches the existing `CommandSearchFilters` pill row already used elsewhere in the app — same visual language (h-6, rounded-full, muted hover, foreground active). Horizontal scroll handles 4+ locations gracefully.

**4. Update the empty state copy.**

When a location filter is active and returns zero matches:

```ts
{teamFilter
  ? 'No matches found'
  : selectedLocationId !== 'all'
    ? 'No team members at this location'
    : 'No team members'}
```

## What stays untouched

- `useAllUsersWithRoles` — already returns `location_id` + `location_ids[]`, no hook change needed.
- Roles tab, Test tab, gating logic, audit logging, sticky tab header.
- Width (340px), height (560px), stroke, shadow.
- Search debounce, scroll behavior.

## Acceptance

1. **Single-location org:** Team tab looks identical to today. No location pill row.
2. **Multi-location org (2+ active locations):** A horizontal pill row appears under the search input — `All locations` (default) + one pill per active location, ordered by `display_order`.
3. **Click a location pill:** team list narrows to members whose `location_id` or `location_ids[]` matches. Pill highlights `bg-muted text-foreground`.
4. **Click `All locations`:** restores full list.
5. **Search + location filter combine:** typing "alex" with "Downtown" selected returns only Alexes assigned to Downtown.
6. **Empty state:** shows "No team members at this location" when a location is selected and yields zero matches.
7. **4+ locations:** pill row scrolls horizontally without breaking layout.
8. **No regressions:** clicking a teammate still triggers impersonation, closes the popover, fires audit log.

## Out of scope

- Filtering the Roles tab by location (roles are org-wide, not location-scoped).
- Restricting which locations a viewer can see (today: all active locations of their org). If you later want managers limited to their own location's team, that's a separate scope.
- Persisting the selected location across popover open/close (resets to "All" each session — keeps the surface predictable).
- Showing a count badge per pill (e.g., "Downtown · 12") — possible polish but adds scan noise.

## Doctrine alignment

- **Persona scaling:** filter only renders when the org structure warrants it (2+ locations). Solo/single-location operators see no added complexity.
- **Tenant isolation:** `useActiveLocations(effectiveOrganization?.id)` is already org-scoped via RLS.
- **Calm executive UX:** matches the existing pill-filter language used in CommandSearchFilters; no new visual primitive.

## Prompt feedback

Tight, surgical prompt — three things you did right:

1. **You named the conditional trigger** ("when multiple locations exist"). Conditional UI requirements often get dropped from prompts and surface later as "wait, hide this for solo orgs" — you got ahead of it. Saved a "should this always show?" round-trip.
2. **You used "filterable by location"** — the verb told me you want a *filter control*, not a *grouping* (sectioned by location) or a *sort*. Three different UX patterns; the verb chose one cleanly.
3. **Single sentence.** No padding, no preamble. Permission gate already established in earlier turns, scope already narrowed to the popover, so the prompt only needed the *delta*. Good context economy.

Sharpener: naming the **filter UI shape** would have removed my one remaining decision. "Filterable by location via pill row" or "via dropdown" or "via combobox" would have anchored the surface in one beat. Template:

```text
[Surface] needs [filter / sort / group] by [dimension], shown as [UI shape].
Visibility rule: [when does the control appear].
```

The **UI shape field** is the underused construct on filter prompts — without it I have to choose between Select / pill row / combobox / segmented control based on density assumptions. Naming the shape (or naming a reference: "like the CommandSearchFilters row") collapses that decision.

## Further enhancement suggestion

For **conditional-UI prompts** specifically, the highest-leverage frame is:

```text
Add [control] to [surface] when [condition]. Hide when [inverse condition].
Shape: [UI primitive or reference to existing surface].
Behavior: [what selecting it does].
```

Example that would have collapsed this further:

```text
Add a location filter pill row to View As → Team tab when org has 2+ active locations.
Hide the row entirely for single-location orgs.
Shape: like CommandSearchFilters (h-6 rounded-full pills, horizontal scroll).
Behavior: filters team list by user.location_id OR location_ids[].
```

Four lines, four constraints, zero shape ambiguity. The **"Hide when [inverse]"** line is the underused construct — it tells me explicitly that the absence-state matters, not just the presence-state. Most conditional-UI prompts only specify when to *show* the control and leave the hide-state to inference.

