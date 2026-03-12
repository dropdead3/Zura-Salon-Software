import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';
import { useMemo } from 'react';

export interface LocationInventoryLead {
  id: string;
  organization_id: string;
  location_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  // Joined from employee_profiles
  display_name?: string;
  photo_url?: string;
}

export function useLocationInventoryLeads() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['location-inventory-leads', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_inventory_leads')
        .select('*')
        .eq('organization_id', orgId!);

      if (error) throw error;

      // Join with employee_profiles for display info
      if (data && data.length > 0) {
        const userIds = data.map((d: any) => d.user_id);
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name, photo_url')
          .in('user_id', userIds);

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, p])
        );

        return data.map((lead: any) => {
          const profile = profileMap.get(lead.user_id);
          return {
            ...lead,
            display_name: profile?.display_name || profile?.full_name || 'Unknown',
            photo_url: profile?.photo_url || null,
          } as LocationInventoryLead;
        });
      }

      return data as LocationInventoryLead[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAssignInventoryLead() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, userId }: { locationId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('location_inventory_leads')
        .upsert(
          {
            organization_id: orgId!,
            location_id: locationId,
            user_id: userId,
            assigned_by: user?.id || null,
          },
          { onConflict: 'organization_id,location_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-inventory-leads'] });
      toast.success('Inventory lead assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign inventory lead: ' + error.message);
    },
  });
}

export function useRemoveInventoryLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('location_inventory_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-inventory-leads'] });
      toast.success('Inventory lead removed');
    },
    onError: (error) => {
      toast.error('Failed to remove inventory lead: ' + error.message);
    },
  });
}

export function useLocationCoverageWarnings() {
  const { data: locations } = useActiveLocations();
  const { data: leads } = useLocationInventoryLeads();

  return useMemo(() => {
    if (!locations || !leads) return { uncoveredLocations: [], isLoading: !locations || !leads };

    const coveredLocationIds = new Set(leads.map(l => l.location_id));
    const uncoveredLocations = locations.filter(loc => !coveredLocationIds.has(loc.id));

    return { uncoveredLocations, isLoading: false };
  }, [locations, leads]);
}
