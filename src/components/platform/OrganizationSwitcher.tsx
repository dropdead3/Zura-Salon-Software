import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, Building2, Globe } from 'lucide-react';
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
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PlatformButton } from './ui/PlatformButton';
import { PlatformBadge } from './ui/PlatformBadge';

interface OrganizationSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function OrganizationSwitcher({ className, compact = false }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: organizations = [], isLoading } = useOrganizations();
  const { selectedOrganization, setSelectedOrganization, isImpersonating } = useOrganizationContext();

  const handleSelect = (org: Organization | null) => {
    setSelectedOrganization(org);
    setOpen(false);
    
    if (org) {
      // Navigate to org dashboard
      navigate('/dashboard');
      
      logPlatformAction(org.id, 'org_viewed', 'organization', org.id, {
        organization_name: org.name,
        organization_slug: org.slug,
        action: 'context_switch',
      });
    } else {
      // Navigate to platform overview
      navigate('/dashboard/platform/overview');
    }
  };

  const activeOrgs = organizations.filter(o => o.status === 'active');
  const onboardingOrgs = organizations.filter(o => o.status !== 'active');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PlatformButton
          variant={isImpersonating ? 'default' : 'secondary'}
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between gap-2',
            compact ? 'w-[200px]' : 'w-[280px]',
            isImpersonating && 'bg-violet-500/20 border-violet-500/50 text-violet-300 hover:bg-violet-500/30',
            className
          )}
        >
          {selectedOrganization ? (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-violet-400" />
              <span className="truncate">{selectedOrganization.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span>Platform View</span>
            </div>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </PlatformButton>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-slate-800 border-slate-700" align="start">
        <Command className="bg-transparent">
          <CommandInput 
            placeholder="Search organizations..." 
            className="border-slate-700 text-white placeholder:text-slate-500"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-slate-500 py-6 text-center text-sm">
              {isLoading ? 'Loading...' : 'No organizations found.'}
            </CommandEmpty>
            
            {/* Platform-wide option */}
            <CommandGroup>
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 hover:text-white aria-selected:bg-slate-700 aria-selected:text-white"
              >
                <Globe className="h-4 w-4 text-slate-400" />
                <span>Platform View</span>
                <span className="ml-auto text-xs text-slate-500">All accounts</span>
                {!selectedOrganization && (
                  <Check className="ml-2 h-4 w-4 text-violet-400" />
                )}
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator className="bg-slate-700" />
            
            {/* Active organizations */}
            {activeOrgs.length > 0 && (
              <CommandGroup heading="Active Accounts" className="text-slate-500">
                {activeOrgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => handleSelect(org)}
                    className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 hover:text-white aria-selected:bg-slate-700 aria-selected:text-white"
                  >
                    <Building2 className="h-4 w-4 text-violet-400" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{org.name}</span>
                      <span className="text-xs text-slate-500">#{org.account_number ?? org.slug}</span>
                    </div>
                    {selectedOrganization?.id === org.id && (
                      <Check className="h-4 w-4 shrink-0 text-violet-400" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {/* Onboarding organizations */}
            {onboardingOrgs.length > 0 && (
              <CommandGroup heading="Onboarding" className="text-slate-500">
                {onboardingOrgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => handleSelect(org)}
                    className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 hover:text-white aria-selected:bg-slate-700 aria-selected:text-white"
                  >
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{org.name}</span>
                      <span className="text-xs text-slate-500">#{org.account_number ?? org.slug}</span>
                    </div>
                    <PlatformBadge variant="outline" size="sm" className="shrink-0">
                      {org.onboarding_stage}
                    </PlatformBadge>
                    {selectedOrganization?.id === org.id && (
                      <Check className="h-4 w-4 shrink-0 text-violet-400" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
