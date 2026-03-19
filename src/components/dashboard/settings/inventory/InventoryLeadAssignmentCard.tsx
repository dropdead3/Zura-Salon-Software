import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { tokens } from '@/lib/design-tokens';
import { MapPin, UserCheck, X, Loader2, RotateCcw, Search, Bell, BadgeCheck, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useActiveLocations } from '@/hooks/useLocations';
import {
  useLocationInventoryLeads,
  useLocationDefaultLeads,
  useAssignInventoryLead,
  useRemoveInventoryLead,
} from '@/hooks/useLocationInventoryLeads';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

interface StaffOption {
  user_id: string;
  display_name: string;
  photo_url: string | null;
}

function useOrgStaffOptions() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['org-staff-options', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name');

      if (error) throw error;
      return (data || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.full_name || 'Unknown',
        photo_url: p.photo_url,
      })) as StaffOption[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function InventoryLeadAssignmentCard() {
  const [search, setSearch] = useState('');
  const { data: locations, isLoading: locationsLoading } = useActiveLocations();
  const { data: leads, isLoading: leadsLoading } = useLocationInventoryLeads();
  const { data: defaultLeads, isLoading: defaultsLoading } = useLocationDefaultLeads();
  const { data: staffOptions, isLoading: staffLoading } = useOrgStaffOptions();
  const assignLead = useAssignInventoryLead();
  const removeLead = useRemoveInventoryLead();
  const [pendingRoleSync, setPendingRoleSync] = useState<{ userId: string; name: string } | null>(null);

  const handleAssignLead = async (locationId: string, userId: string) => {
    assignLead.mutate({ locationId, userId });
    
    // Check if this user has the inventory_manager role
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'inventory_manager');

    if (!existingRoles || existingRoles.length === 0) {
      const staff = staffOptions?.find(s => s.user_id === userId);
      setPendingRoleSync({ userId, name: staff?.display_name || 'this person' });
    }
  };

  const handleGrantInventoryRole = async () => {
    if (!pendingRoleSync) return;
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: pendingRoleSync.userId, role: 'inventory_manager' });
    if (error) {
      toast.error('Failed to assign role', { description: error.message });
    } else {
      toast.success('Inventory Manager role granted');
    }
    setPendingRoleSync(null);
  };

  const leadByLocation = useMemo(() => {
    const map = new Map<string, typeof leads extends (infer T)[] | undefined ? T : never>();
    for (const lead of leads || []) {
      map.set(lead.location_id, lead);
    }
    return map;
  }, [leads]);

  const isLoading = locationsLoading || leadsLoading || staffLoading || defaultsLoading;

  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter(loc => loc.name.toLowerCase().includes(q));
  }, [locations, search]);

  const assignedCount = useMemo(() => {
    if (!locations || !leads || !defaultLeads) return 0;
    return locations.filter(loc => leadByLocation.has(loc.id) || defaultLeads.has(loc.id)).length;
  }, [locations, leads, defaultLeads, leadByLocation]);

  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!locations || locations.length === 0) return null;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className={tokens.card.iconBox}>
            <UserCheck className={tokens.card.icon} />
          </div>
          <div className="flex-1">
            <CardTitle className={tokens.card.title}>Inventory Leads</CardTitle>
            <CardDescription className="text-xs mt-1">
              Assign a team member to manage inventory at each location. Defaults to the location's manager.
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              {assignedCount} of {locations.length} locations covered
            </p>
            <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">What happens when a lead is assigned?</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-none m-0 p-0">
                <li className="flex items-start gap-2">
                  <UserCheck className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>They become the point of contact for inventory at that location</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>They'll receive low-stock alerts and reorder notifications for their location</span>
                </li>
                <li className="flex items-start gap-2">
                  <BadgeCheck className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>An "Inventory Lead" badge will appear on their profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <RotateCcw className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>If no lead is assigned, the location's manager is used by default</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search locations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoCapitalize="off"
              className="pl-9 h-8 text-xs"
            />
          </div>
        )}
        <ScrollArea className="max-h-[320px]">
          <div className="space-y-2">
        {filteredLocations.map((location) => {
          const explicitLead = leadByLocation.get(location.id);
          const defaultLead = defaultLeads?.get(location.id);
          const isDefault = !explicitLead && !!defaultLead;
          const resolvedName = explicitLead?.display_name || defaultLead?.display_name;
          const resolvedPhoto = explicitLead?.photo_url || defaultLead?.photo_url;
          const hasAnyLead = !!explicitLead || !!defaultLead;

          return (
            <div
              key={location.id}
              className={cn(
                tokens.card.inner,
                'flex items-center justify-between px-4 py-2.5'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{location.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasAnyLead ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {resolvedPhoto && <AvatarImage src={resolvedPhoto} alt={resolvedName} />}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(resolvedName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{resolvedName}</span>
                    {isDefault && (
                      <PlatformBadge variant="info" size="sm">
                        Default — Manager
                      </PlatformBadge>
                    )}
                    {explicitLead ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Reset to default (manager)"
                        onClick={() => removeLead.mutate(explicitLead.id)}
                        disabled={removeLead.isPending}
                      >
                        {defaultLead ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    ) : null}
                    {/* Allow override even when default is shown */}
                    {isDefault && (
                      <Select
                        onValueChange={(userId) => {
                          assignLead.mutate({ locationId: location.id, userId });
                        }}
                      >
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                          <SelectValue placeholder="Override…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(staffOptions || []).map((staff) => (
                            <SelectItem key={staff.user_id} value={staff.user_id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  {staff.photo_url && <AvatarImage src={staff.photo_url} />}
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(staff.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                                {staff.display_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <Select
                    onValueChange={(userId) => {
                      assignLead.mutate({ locationId: location.id, userId });
                    }}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue placeholder="Assign lead…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(staffOptions || []).map((staff) => (
                        <SelectItem key={staff.user_id} value={staff.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              {staff.photo_url && <AvatarImage src={staff.photo_url} />}
                              <AvatarFallback className="text-[8px]">
                                {getInitials(staff.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            {staff.display_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </ScrollArea>
        {filteredLocations.length === 0 && search && (
          <p className="text-xs text-muted-foreground text-center py-4">No locations match "{search}"</p>
        )}
      </CardContent>
    </Card>
  );
}
