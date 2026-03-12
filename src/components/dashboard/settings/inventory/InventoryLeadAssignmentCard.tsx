import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { MapPin, UserCheck, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveLocations } from '@/hooks/useLocations';
import {
  useLocationInventoryLeads,
  useAssignInventoryLead,
  useRemoveInventoryLead,
} from '@/hooks/useLocationInventoryLeads';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { data: locations, isLoading: locationsLoading } = useActiveLocations();
  const { data: leads, isLoading: leadsLoading } = useLocationInventoryLeads();
  const { data: staffOptions, isLoading: staffLoading } = useOrgStaffOptions();
  const assignLead = useAssignInventoryLead();
  const removeLead = useRemoveInventoryLead();

  const leadByLocation = useMemo(() => {
    const map = new Map<string, typeof leads extends (infer T)[] | undefined ? T : never>();
    for (const lead of leads || []) {
      map.set(lead.location_id, lead);
    }
    return map;
  }, [leads]);

  const isLoading = locationsLoading || leadsLoading || staffLoading;

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
              Assign a team member to manage inventory at each location.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {locations.map((location) => {
          const lead = leadByLocation.get(location.id);
          return (
            <div
              key={location.id}
              className={cn(
                tokens.card.inner,
                'flex items-center justify-between px-4 py-3'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{location.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {lead ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {lead.photo_url && <AvatarImage src={lead.photo_url} alt={lead.display_name} />}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(lead.display_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{lead.display_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLead.mutate(lead.id)}
                      disabled={removeLead.isPending}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
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
      </CardContent>
    </Card>
  );
}
