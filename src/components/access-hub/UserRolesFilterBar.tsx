import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationMultiSelect } from '@/components/ui/location-multi-select';
import { Input } from '@/components/ui/input';
import { Search, Filter, ChevronDown, LayoutList, LayoutGrid, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Location {
  id: string;
  name: string;
}

interface RoleOption {
  name: string;
  display_name: string;
  color: string;
  icon: string;
}

interface UserRolesFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locations: Location[];
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  roles: RoleOption[];
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  showUnassigned: boolean;
  onUnassignedChange: (show: boolean) => void;
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
  showLocationFilter: boolean;
}

export function UserRolesFilterBar({
  searchQuery,
  onSearchChange,
  locations,
  selectedLocationIds,
  onLocationChange,
  roles,
  selectedRoles,
  onRolesChange,
  showUnassigned,
  onUnassignedChange,
  viewMode,
  onViewModeChange,
  showLocationFilter,
}: UserRolesFilterBarProps) {
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);

  const allRolesSelected = selectedRoles.length === 0;
  const effectiveSelectedRoles = allRolesSelected ? roles.map(r => r.name) : selectedRoles;

  const handleRoleToggle = (roleName: string) => {
    const current = new Set(effectiveSelectedRoles);
    if (current.has(roleName)) {
      current.delete(roleName);
      if (current.size === 0) {
        onRolesChange([]);
        return;
      }
    } else {
      current.add(roleName);
    }
    if (current.size === roles.length) {
      onRolesChange([]);
    } else {
      onRolesChange(Array.from(current));
    }
  };

  const roleFilterLabel = allRolesSelected
    ? 'All Roles'
    : selectedRoles.length === 1
      ? roles.find(r => r.name === selectedRoles[0])?.display_name ?? '1 Role'
      : `${selectedRoles.length} Roles`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-muted/50 border-border/60"
        />
      </div>

      {/* Location Filter */}
      {showLocationFilter && (
        <LocationMultiSelect
          locations={locations}
          selectedIds={selectedLocationIds}
          onSelectionChange={onLocationChange}
        />
      )}

      {/* Role Filter */}
      <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-9 w-auto min-w-[140px] justify-between text-sm border-border font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{roleFilterLabel}</span>
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <div className="p-2 border-b border-border">
            <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md hover:bg-accent text-sm font-medium">
              <Checkbox
                checked={allRolesSelected}
                onCheckedChange={() => onRolesChange([])}
              />
              All Roles
            </label>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-2 space-y-0.5">
            {roles.map(role => {
              const RoleIcon = getRoleIconComponent(role.icon);
              return (
                <label
                  key={role.name}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md hover:bg-accent text-sm"
                >
                  <Checkbox
                    checked={effectiveSelectedRoles.includes(role.name)}
                    onCheckedChange={() => handleRoleToggle(role.name)}
                  />
                  <RoleIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  {role.display_name}
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Unassigned Toggle */}
      <Button
        variant={showUnassigned ? 'default' : 'outline'}
        size="sm"
        className={cn(
          "h-9 gap-1.5 text-sm font-normal",
          showUnassigned && "bg-primary text-primary-foreground"
        )}
        onClick={() => onUnassignedChange(!showUnassigned)}
      >
        <UserX className="w-4 h-4" />
        Unassigned
      </Button>

      {/* View Toggle */}
      <div className="flex items-center border border-border rounded-full overflow-hidden ml-auto">
        <button
          onClick={() => onViewModeChange('card')}
          className={cn(
            "p-2 transition-colors",
            viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
          title="Card view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          className={cn(
            "p-2 transition-colors",
            viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
          title="Table view"
        >
          <LayoutList className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
