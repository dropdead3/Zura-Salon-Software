/**
 * LocationGroupSelect — A location dropdown that groups locations by their
 * location_group when groups exist. Falls back to flat list when no groups are defined.
 */
import { useMemo, useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useLocationGroups, type LocationGroup } from '@/hooks/useLocationGroups';

interface Location {
  id: string;
  name: string;
  location_group_id?: string | null;
}

interface LocationGroupSelectProps {
  locations: Location[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function LocationGroupSelect({
  locations,
  selectedIds,
  onSelectionChange,
}: LocationGroupSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: groups = [] } = useLocationGroups();
  const allSelected = selectedIds.length === 0 || selectedIds.length === locations.length;
  const effectiveSelected = allSelected ? locations.map(l => l.id) : selectedIds;

  const grouped = useMemo(() => {
    if (groups.length === 0) return [{ group: null as LocationGroup | null, locs: locations }];

    const result: { group: LocationGroup | null; locs: Location[] }[] = [];
    for (const g of groups) {
      const locs = locations.filter(l => l.location_group_id === g.id);
      if (locs.length > 0) result.push({ group: g, locs });
    }
    const ungrouped = locations.filter(l => !l.location_group_id);
    if (ungrouped.length > 0) result.push({ group: null, locs: ungrouped });
    return result;
  }, [locations, groups]);

  const handleToggle = (id: string) => {
    const current = new Set(effectiveSelected);
    if (current.has(id)) {
      current.delete(id);
      if (current.size === 0) {
        onSelectionChange([]);
        return;
      }
    } else {
      current.add(id);
    }
    if (current.size === locations.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(Array.from(current));
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([locations[0]?.id].filter(Boolean));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    const groupLocs = locations.filter(l => l.location_group_id === groupId);
    const allGroupSelected = groupLocs.every(l => effectiveSelected.includes(l.id));
    const current = new Set(effectiveSelected);
    if (allGroupSelected) {
      // Deselect group
      groupLocs.forEach(l => current.delete(l.id));
      if (current.size === 0) {
        onSelectionChange([]);
        return;
      }
    } else {
      // Select entire group
      groupLocs.forEach(l => current.add(l.id));
    }
    if (current.size === locations.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(Array.from(current));
    }
  };

  let label: string;
  if (allSelected) {
    label = 'All Locations';
  } else if (effectiveSelected.length === 1) {
    const loc = locations.find(l => l.id === effectiveSelected[0]);
    label = loc?.name ?? '1 Location';
  } else {
    label = `${effectiveSelected.length} of ${locations.length} Locations`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-9 w-auto min-w-[180px] justify-between text-sm border-border font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start" sideOffset={0} onMouseLeave={() => setOpen(false)}>
        <div className="p-2 border-b border-border">
          <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md hover:bg-accent text-sm font-medium">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            Select All
          </label>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
          {grouped.map(({ group, locs }) => (
            <div key={group?.id ?? 'ungrouped'}>
              {group && (
                <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md hover:bg-accent text-xs font-display tracking-wide text-muted-foreground mt-1.5">
                  <Checkbox
                    checked={locs.every(l => effectiveSelected.includes(l.id))}
                    onCheckedChange={() => handleSelectGroup(group.id)}
                  />
                  {group.name}
                </label>
              )}
              {locs.map(loc => (
                <label
                  key={loc.id}
                  className={`flex items-center gap-2 py-1.5 cursor-pointer rounded-md hover:bg-accent text-sm ${group ? 'px-4' : 'px-2'}`}
                >
                  <Checkbox
                    checked={effectiveSelected.includes(loc.id)}
                    onCheckedChange={() => handleToggle(loc.id)}
                  />
                  {loc.name}
                </label>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
