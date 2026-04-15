import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface HouseholdMember {
  id: string;
  client_id: string;
  added_at: string;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    visit_count: number;
    total_spend: number | null;
    last_visit: string | null;
    phorest_client_id: string | null;
  };
}

export interface Household {
  id: string;
  organization_id: string;
  household_name: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  members: HouseholdMember[];
}

/**
 * Fetch all households for the current organization.
 */
export function useHouseholds() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['households', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data: households, error } = await supabase
        .from('client_households' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!households || households.length === 0) return [];

      // Fetch all members for these households
      const householdIds = (households as any[]).map((h: any) => h.id);
      const { data: members, error: membersError } = await supabase
        .from('client_household_members' as any)
        .select('*')
        .in('household_id', householdIds);

      if (membersError) throw membersError;

      // Fetch client details for all members
      const clientIds = (members as any[] || []).map((m: any) => m.client_id);
      let clientMap: Record<string, any> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('v_all_clients' as any)
          .select('id, name, email, phone, visit_count, total_spend, last_visit, phorest_client_id')
          .in('id', clientIds);
        if (clients) {
          clientMap = Object.fromEntries((clients as any[]).map((c: any) => [c.id, c]));
        }
      }

      // Assemble
      return (households as any[]).map((h: any) => ({
        ...h,
        members: (members as any[] || [])
          .filter((m: any) => m.household_id === h.id)
          .map((m: any) => ({
            ...m,
            client: clientMap[m.client_id] || null,
          })),
      })) as Household[];
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch the household a specific client belongs to (if any).
 */
export function useClientHousehold(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-household', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data: membership, error } = await supabase
        .from('client_household_members' as any)
        .select('*, client_households(*)')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      if (!membership) return null;

      const household = (membership as any).client_households;
      if (!household) return null;

      // Fetch all members of this household
      const { data: allMembers } = await supabase
        .from('client_household_members' as any)
        .select('*')
        .eq('household_id', household.id);

      const memberClientIds = (allMembers as any[] || []).map((m: any) => m.client_id);
      let clientMap: Record<string, any> = {};
      if (memberClientIds.length > 0) {
        const { data: clients } = await supabase
          .from('v_all_clients' as any)
          .select('id, name, email, phone, visit_count, total_spend, last_visit, phorest_client_id')
          .in('id', memberClientIds);
        if (clients) clientMap = Object.fromEntries((clients as any[]).map((c: any) => [c.id, c]));
      }

      return {
        ...household,
        members: (allMembers as any[] || []).map((m: any) => ({
          ...m,
          client: clientMap[m.client_id] || null,
        })),
      } as Household;
    },
    enabled: !!clientId,
  });
}

/**
 * Fetch household members for a client identified by phorest_client_id (used in appointment panel).
 */
export function useHouseholdByPhorestClientId(phorestClientId: string | null | undefined) {
  return useQuery({
    queryKey: ['household-by-phorest', phorestClientId],
    queryFn: async () => {
      if (!phorestClientId) return null;

      // First get the client's internal id
      const { data: client } = await supabase
        .from('v_all_clients' as any)
        .select('id')
        .eq('phorest_client_id', phorestClientId)
        .maybeSingle();

      if (!client) return null;

      // Check if they're in a household
      const { data: membership } = await supabase
        .from('client_household_members' as any)
        .select('household_id')
        .eq('client_id', (client as any).id)
        .maybeSingle();

      if (!membership) return null;

      const householdId = (membership as any).household_id;

      // Get the household info
      const { data: household } = await supabase
        .from('client_households' as any)
        .select('*')
        .eq('id', householdId)
        .single();

      if (!household) return null;

      // Get all members with client details
      const { data: allMembers } = await supabase
        .from('client_household_members' as any)
        .select('*')
        .eq('household_id', householdId);

      const memberClientIds = (allMembers as any[] || []).map((m: any) => m.client_id);
      let clientMap: Record<string, any> = {};
      if (memberClientIds.length > 0) {
        const { data: clients } = await supabase
          .from('v_all_clients' as any)
          .select('id, name, email, phone, visit_count, total_spend, last_visit, phorest_client_id')
          .in('id', memberClientIds);
        if (clients) clientMap = Object.fromEntries((clients as any[]).map((c: any) => [c.id, c]));
      }

      return {
        ...(household as any),
        currentClientId: (client as any).id,
        members: (allMembers as any[] || [])
          .map((m: any) => ({
            ...m,
            client: clientMap[m.client_id] || null,
          }))
          .filter((m: any) => m.client_id !== (client as any).id), // Exclude current client
      } as Household & { currentClientId: string };
    },
    enabled: !!phorestClientId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create a new household with initial members.
 */
export function useCreateHousehold() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({ name, clientIds }: { name: string; clientIds: string[] }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId || !user?.id) throw new Error('Not authenticated or no organization');

      const { data: household, error: hError } = await supabase
        .from('client_households' as any)
        .insert({ organization_id: orgId, household_name: name, created_by: user.id } as any)
        .select('id')
        .single();

      if (hError) throw hError;

      const householdId = (household as any).id;

      // Add members
      const memberRows = clientIds.map(clientId => ({
        household_id: householdId,
        client_id: clientId,
      }));

      const { error: mError } = await supabase
        .from('client_household_members' as any)
        .insert(memberRows as any);

      if (mError) throw mError;

      return { householdId, name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['client-household'] });
      toast.success('Household created');
    },
    onError: (error) => {
      toast.error('Failed to create household: ' + error.message);
    },
  });
}

/**
 * Add a client to an existing household.
 */
export function useAddToHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdId, clientId }: { householdId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_household_members' as any)
        .insert({ household_id: householdId, client_id: clientId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['client-household'] });
      toast.success('Added to household');
    },
    onError: (error) => {
      toast.error('Failed to add to household: ' + error.message);
    },
  });
}

/**
 * Remove a client from a household. Deletes the household if it becomes empty.
 */
export function useRemoveFromHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, householdId }: { memberId: string; householdId: string }) => {
      const { error } = await supabase
        .from('client_household_members' as any)
        .delete()
        .eq('id', memberId);
      if (error) throw error;

      // Check if household is now empty
      const { count } = await supabase
        .from('client_household_members' as any)
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId);

      if (count === 0) {
        await supabase
          .from('client_households' as any)
          .delete()
          .eq('id', householdId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['client-household'] });
      toast.success('Removed from household');
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });
}

/**
 * Rename a household.
 */
export function useUpdateHouseholdName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdId, name }: { householdId: string; name: string }) => {
      const { error } = await supabase
        .from('client_households' as any)
        .update({ household_name: name } as any)
        .eq('id', householdId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['client-household'] });
      toast.success('Household renamed');
    },
    onError: (error) => {
      toast.error('Failed to rename: ' + error.message);
    },
  });
}

/**
 * Delete an entire household.
 */
export function useDeleteHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (householdId: string) => {
      const { error } = await supabase
        .from('client_households' as any)
        .delete()
        .eq('id', householdId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['client-household'] });
      toast.success('Household deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete household: ' + error.message);
    },
  });
}
