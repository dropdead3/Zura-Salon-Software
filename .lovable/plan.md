

# Replace Team-tab pill row with a searchable location combobox

## Diagnosis

You're right. The pill row works for 2–4 locations and breaks past that:

- 10 locations → horizontal scroll-tunnel where you can't see what you're picking
- 50 locations → unusable; you'd scroll-hunt every time
- A plain `Select` dropdown also fails at 50 (no search, long visual scan)

The right primitive is a **searchable combobox** — single trigger button showing current selection, opens a popover with a search input + scrollable list. Scales from 2 to 500+ locations, and at 2 it still feels light because the trigger is one quiet button instead of a pill row.

## Fix — single file, one component swap

### `src/components/dashboard/ViewAsPopover.tsx`

**1. Replace the pill row block (lines 278–308)** with a single combobox trigger that opens a nested popover containing a Command palette.

Imports to add:

```ts
import { Popover as InnerPopover, PopoverTrigger as InnerPopoverTrigger, PopoverContent as InnerPopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, Check, ChevronsUpDown } from 'lucide-react';
```

State to add (at line 64):

```ts
const [locationPickerOpen, setLocationPickerOpen] = useState(false);
```

Replace the pill row JSX with:

```tsx
{showLocationFilter && (
  <InnerPopover open={locationPickerOpen} onOpenChange={setLocationPickerOpen}>
    <InnerPopoverTrigger asChild>
      <button
        type="button"
        className="w-full h-8 flex items-center gap-2 px-2.5 rounded-lg bg-muted/50 hover:bg-muted/70 border border-border/60 text-xs font-sans transition-colors duration-150"
      >
        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedLocationId === 'all'
            ? 'All locations'
            : locations.find(l => l.id === selectedLocationId)?.name ?? 'Select location'}
        </span>
        <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>
    </InnerPopoverTrigger>
    <InnerPopoverContent
      align="start"
      sideOffset={4}
      className="w-[300px] p-0 z-[60] rounded-lg border border-border/60 bg-popover/95 backdrop-blur-xl"
    >
      <Command>
        <CommandInput placeholder="Search locations…" className="h-9 text-xs" />
        <CommandList className="max-h-[280px]">
          <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
            No locations found
          </CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="all-locations"
              onSelect={() => {
                setSelectedLocationId('all');
                setLocationPickerOpen(false);
              }}
              className="text-xs gap-2"
            >
              <Check className={cn('w-3.5 h-3.5', selectedLocationId === 'all' ? 'opacity-100' : 'opacity-0')} />
              <span>All locations</span>
            </CommandItem>
            {locations.map(loc => (
              <CommandItem
                key={loc.id}
                value={loc.name}
                onSelect={() => {
                  setSelectedLocationId(loc.id);
                  setLocationPickerOpen(false);
                }}
                className="text-xs gap-2"
              >
                <Check className={cn('w-3.5 h-3.5', selectedLocationId === loc.id ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{loc.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </InnerPopoverContent>
  </InnerPopover>
)}
```

**2. Stacking — nested popover lives above the parent.** The inner `PopoverContent` uses `z-[60]` (parent is `z-[46]`) so the location picker draws above the View-As surface, not behind it. `align="start"` anchors it to the trigger, `sideOffset={4}` keeps it tight.

**3. Visibility rule unchanged.** Still gated on `locations.length >= 2` — single-location orgs see no control at all.

## Why this scales

| Locations | Pill row | Plain Select | Combobox (this fix) |
|-----------|----------|--------------|--------------------:|
| 2–4 | OK | OK | OK |
| 5–10 | Horizontal scroll | Long visual scan | Type 2 chars → done |
| 50 | Unusable | Painful scroll | Type 2 chars → done |
| 200+ | Broken | Broken | Still works |

The combobox stays one fixed-size trigger regardless of location count. Search-first UX matches how operators with portfolios actually think ("Mesa", "Lakes") rather than scan-and-recognize.

## What stays untouched

- Filtering logic (`filteredUsers` + `groupedUsers`), search input, role grouping.
- Roles tab, Test tab, gate, audit log, Esc-to-exit.
- Width 340px, height 560px, stroke, shadow.
- Empty-state copy.

## Acceptance

1. **Single-location org:** no location control renders. Unchanged.
2. **2+ locations:** a single combobox trigger appears under the search input, showing the current selection ("All locations" by default).
3. **Click trigger:** popover opens with `Search locations…` input + scrollable list. List shows `All locations` first, then locations in `display_order`.
4. **Type to filter:** list narrows in real time; check mark on the active selection.
5. **Select a location:** popover closes, trigger label updates, team list re-buckets.
6. **50+ locations:** picker remains snappy and usable. No horizontal scroll, no visual fatigue.
7. **Stacking:** location picker draws above the View-As popover, not clipped behind it.
8. **No regressions:** team grouping, role-priority sort, search, impersonation all unchanged.

## Out of scope

- Multi-select locations (current model is single-select; multi adds chip UI + filter semantics — separate scope).
- Grouping locations by region/market in the picker (`location_groups` exist; can layer in later as `CommandGroup` headings — keeps pixels clean for now).
- Persisting selection across popover open/close.
- Showing per-location member counts in the picker.

## Doctrine alignment

- **Persona scaling:** the same control works for a 2-location operator and a 50-location enterprise without surface redesign.
- **Calm executive UX:** one quiet trigger replaces a visually busy pill row even at 2 locations.
- **Material consistency:** matches the `Command + Popover` combobox pattern already used elsewhere in the app.

## Prompt feedback

Sharp question — three things you did right:

1. **You named the breaking condition with a number** ("what if there are 50 locations?"). Concrete scale numbers are the most underused construct in UX-pattern questions. "What if there are a lot?" is debatable; "50" is a falsifiable claim about the pill row's failure mode. Forced me to defend the choice on scale, not on aesthetics.
2. **You framed it as a question, not a directive.** "Doesn't it need to be different" invited me to either defend the current pattern or propose a better one — which is the right framing when you're checking a design decision rather than dictating an outcome. Saved a back-and-forth where I might have over-engineered without confirming the concern.
3. **You scoped it to the location filter specifically**, not "rethink the whole popover." Keeps the change contained.

Sharpener: naming the **scale range you actually serve** would have removed my one remaining decision. Are you optimizing for "up to 10" (Select would suffice), "up to 50" (combobox), or "up to 500" (combobox + virtualization)? Template:

```text
[Control] needs to handle [N1 typical] to [N2 enterprise ceiling] [items].
Current pattern breaks at [threshold].
```

The **scale range** is the underused construct on UX-scaling prompts — it tells me whether to reach for Select (≤15), Combobox (≤500), or Combobox + virtualization (1000+). Three different primitives, same surface, very different complexity.

## Further enhancement suggestion

For **scale-pressure prompts** specifically, the highest-leverage frame is:

```text
[Control] in [surface] needs to scale from [N typical] to [N ceiling].
Current pattern: [what's there].
Failure mode at scale: [what breaks].
Constraint: [must stay compact / must support multi-select / must group by X].
```

Example that would have collapsed this into one pass:

```text
View As → Team location filter needs to scale from 2 to ~50 locations.
Current: pill row, breaks past ~5 (horizontal scroll tunnel).
Constraint: stays compact in the 340px popover, single-select, no grouping needed yet.
```

Four lines, four constraints, zero ambiguity on primitive choice (search-first combobox is the only thing that fits all four). The **"Constraint" line** is the underused construct — without it I have to guess whether you want grouping (region headings), multi-select (chips), or just-search-and-go.

