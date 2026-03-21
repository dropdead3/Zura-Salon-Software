import React, { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserOrganizations, useSetActiveOrganization, type UserOrganization } from '@/hooks/useUserOrganizations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface AccountOwnerOrgSwitcherProps {
  className?: string;
  isCollapsed?: boolean;
}

/**
 * Organization switcher for account owners with multiple organizations.
 * Distinct from the platform OrganizationSwitcher:
 * - Shows only orgs the user owns/admins
 * - Gold/amber styling instead of purple platform theme
 * - Positioned in sidebar
 * - Persists selection to profile
 */
export function AccountOwnerOrgSwitcher({ className, isCollapsed = false }: AccountOwnerOrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { data: organizations = [], isLoading } = useUserOrganizations();
  const { effectiveOrganization, setSelectedOrganization } = useOrganizationContext();
  const setActiveOrg = useSetActiveOrganization();

  // Don't render if user has single org or no orgs
  if (organizations.length <= 1) {
    return null;
  }

  const currentOrg = effectiveOrganization;

  const handleSelect = async (org: UserOrganization) => {
    setSelectedOrganization(org);
    setOpen(false);
    
    // Persist selection
    try {
      await setActiveOrg.mutateAsync(org.id);
    } catch (error) {
      console.error('Failed to persist org selection:', error);
    }
  };

  const getRoleBadge = (org: UserOrganization) => {
    if (org.isPrimary) {
      return (
        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
          Primary
        </Badge>
      );
    }
    if (org.membershipRole === 'owner') {
      return (
        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Crown className="h-3 w-3 mr-1" />
          Owner
        </Badge>
      );
    }
    return null;
  };

  if (isCollapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg",
              "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30",
              className
            )}
            title={currentOrg?.name || 'Select Organization'}
          >
            <Building2 className="h-4 w-4 text-amber-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start" side="right">
          <OrgSwitcherContent
            organizations={organizations}
            currentOrg={currentOrg}
            isLoading={isLoading}
            onSelect={handleSelect}
            getRoleBadge={getRoleBadge}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between gap-2 h-auto py-2",
            "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20",
            "text-left font-normal",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-sm font-medium">
                {currentOrg?.name || 'Select Organization'}
              </span>
              {organizations.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {organizations.length} organizations
                </span>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <OrgSwitcherContent
          organizations={organizations}
          currentOrg={currentOrg}
          isLoading={isLoading}
          onSelect={handleSelect}
          getRoleBadge={getRoleBadge}
        />
      </PopoverContent>
    </Popover>
  );
}

interface OrgSwitcherContentProps {
  organizations: UserOrganization[];
  currentOrg: { id: string; name: string } | null;
  isLoading: boolean;
  onSelect: (org: UserOrganization) => void;
  getRoleBadge: (org: UserOrganization) => React.ReactNode;
}

function OrgSwitcherContent({ 
  organizations, 
  currentOrg, 
  isLoading, 
  onSelect, 
  getRoleBadge 
}: OrgSwitcherContentProps) {
  return (
    <Command>
      <CommandInput placeholder="Search organizations..." />
      <CommandList className="max-h-[300px]">
        <CommandEmpty>
          {isLoading ? 'Loading...' : 'No organizations found.'}
        </CommandEmpty>
        <CommandGroup heading="Your Organizations">
          {organizations.map((org) => (
            <CommandItem
              key={org.id}
              onSelect={() => onSelect(org)}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-amber-600" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate font-medium">{org.name}</span>
                {org.account_number && (
                  <span className="text-xs text-muted-foreground">
                    #{org.account_number}
                  </span>
                )}
              </div>
              {getRoleBadge(org)}
              {currentOrg?.id === org.id && (
                <Check className="h-4 w-4 shrink-0 text-amber-600" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
