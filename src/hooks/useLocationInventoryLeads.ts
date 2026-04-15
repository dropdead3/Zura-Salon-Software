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

export interface DefaultLeadInfo {
  user_id: string;
  display_name: string;
  photo_url: string | null;
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

      return data as unknown as LocationInventoryLead[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Resolves the default inventory lead for each location by finding managers
 * (user_roles.role = 'manager') whose employee_profiles are assigned to that location.
 * Returns a Map<locationId, DefaultLeadInfo>.
 */
export function useLocationDefaultLeads() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations } = useActiveLocations();

  return useQuery({
    queryKey: ['location-default-leads', orgId],
    queryFn: async () => {
      // Get all managers in the org
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url, location_id, location_ids')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return new Map<string, DefaultLeadInfo>();

      const userIds = profiles.map(p => p.user_id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('role', 'manager');

      if (rolesError) throw rolesError;

      const managerUserIds = new Set((roles || []).map(r => r.user_id));

      // Build map: locationId -> first manager found at that location
      const defaultMap = new Map<string, DefaultLeadInfo>();

      for (const profile of profiles) {
        if (!managerUserIds.has(profile.user_id)) continue;

        // Collect all location IDs this manager is associated with
        const profileLocations: string[] = [];
        if (profile.location_id) profileLocations.push(profile.location_id);
        if (Array.isArray((profile as any).location_ids)) {
          for (const lid of (profile as any).location_ids) {
            if (lid && !profileLocations.includes(lid)) profileLocations.push(lid);
          }
        }

        const info: DefaultLeadInfo = {
          user_id: profile.user_id,
          display_name: profile.display_name || profile.full_name || 'Unknown',
          photo_url: profile.photo_url,
        };

        for (const locId of profileLocations) {
          if (!defaultMap.has(locId)) {
            defaultMap.set(locId, info);
          }
        }
      }

      return defaultMap;
    },
    enabled: !!orgId && !!locations && locations.length > 0,
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
  const { data: defaultLeads } = useLocationDefaultLeads();

  return useMemo(() => {
    if (!locations || !leads || !defaultLeads) return { uncoveredLocations: [], isLoading: !locations || !leads || !defaultLeads };

    const coveredLocationIds = new Set(leads.map(l => l.location_id));
    const uncoveredLocations = locations.filter(
      loc => !coveredLocationIds.has(loc.id) && !defaultLeads.has(loc.id)
    );

    return { uncoveredLocations, isLoading: false };
  }, [locations, leads, defaultLeads]);
}
