import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Star, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrganizations, type Organization, logPlatformAction } from '@/hooks/useOrganizations';
import { useFavoriteOrganizations, useToggleFavoriteOrg } from '@/hooks/useFavoriteOrganizations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PlatformButton } from './ui/PlatformButton';

interface PlatformOrgQuickSwitchProps {
  className?: string;
}

export function PlatformOrgQuickSwitch({ className }: PlatformOrgQuickSwitchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: organizations = [], isLoading } = useOrganizations();
  const { data: favoriteIds = [] } = useFavoriteOrganizations();
  const toggleFavorite = useToggleFavoriteOrg();
  const { setSelectedOrganization } = useOrganizationContext();

  const handleSelect = (org: Organization) => {
    setSelectedOrganization(org);
    setOpen(false);
    navigate('/dashboard');

    logPlatformAction(org.id, 'org_viewed', 'organization', org.id, {
      organization_name: org.name,
      organization_slug: org.slug,
      action: 'quick_switch',
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent, orgId: string) => {
    e.stopPropagation();
    toggleFavorite.mutate({
      organizationId: orgId,
      isFavorited: favoriteIds.includes(orgId),
    });
  };

  const pinnedOrgs = organizations.filter((o) => favoriteIds.includes(o.id));
  const unpinnedOrgs = organizations.filter((o) => !favoriteIds.includes(o.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PlatformButton
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between gap-2 w-[220px]', className)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-400" />
            <span className="text-sm">Switch to Account</span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </PlatformButton>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-slate-800 border-slate-700" align="end">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search accounts..."
            className="border-slate-700 text-white placeholder:text-slate-500"
          />
          <CommandList className="max-h-[340px]">
            <CommandEmpty className="text-slate-500 py-6 text-center text-sm">
              {isLoading ? 'Loading...' : 'No accounts found.'}
            </CommandEmpty>

            {pinnedOrgs.length > 0 && (
              <>
                <CommandGroup heading="Pinned" className="text-slate-500">
                  {pinnedOrgs.map((org) => (
                    <OrgRow
                      key={org.id}
                      org={org}
                      isFavorited
                      onSelect={handleSelect}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </CommandGroup>
                <CommandSeparator className="bg-slate-700" />
              </>
            )}

            <CommandGroup heading="All Accounts" className="text-slate-500">
              {unpinnedOrgs.map((org) => (
                <OrgRow
                  key={org.id}
                  org={org}
                  isFavorited={false}
                  onSelect={handleSelect}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function OrgRow({
  org,
  isFavorited,
  onSelect,
  onToggleFavorite,
}: {
  org: Organization;
  isFavorited: boolean;
  onSelect: (org: Organization) => void;
  onToggleFavorite: (e: React.MouseEvent, orgId: string) => void;
}) {
  return (
    <CommandItem
      onSelect={() => onSelect(org)}
      className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 hover:text-white aria-selected:bg-slate-700 aria-selected:text-white"
    >
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, org.id)}
        className="shrink-0 p-0.5 rounded hover:bg-slate-600/50 transition-colors"
      >
        <Star
          className={cn(
            'h-3.5 w-3.5 transition-colors',
            isFavorited
              ? 'fill-amber-400 text-amber-400'
              : 'text-slate-500 hover:text-amber-400/60'
          )}
        />
      </button>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="truncate text-sm">{org.name}</span>
        <span className="text-xs text-slate-500">
          #{org.account_number ?? org.slug}
        </span>
      </div>
    </CommandItem>
  );
}
