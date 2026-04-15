import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ShiftSwap {
  id: string;
  requester_id: string;
  original_date: string;
  original_start_time: string;
  original_end_time: string;
  location_id: string | null;
  swap_type: 'swap' | 'cover' | 'giveaway';
  reason: string | null;
  status: 'open' | 'claimed' | 'pending_approval' | 'approved' | 'denied' | 'cancelled' | 'expired';
  claimer_id: string | null;
  claimer_date: string | null;
  claimer_start_time: string | null;
  claimer_end_time: string | null;
  manager_id: string | null;
  manager_notes: string | null;
  approved_at: string | null;
  created_at: string;
  expires_at: string | null;
  // Joined data
  requester?: {
    display_name: string | null;
    full_name: string | null;
    photo_url: string | null;
  };
  claimer?: {
    display_name: string | null;
    full_name: string | null;
    photo_url: string | null;
  };
  location?: {
    name: string;
  };
}

export interface ShiftSwapMessage {
  id: string;
  swap_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    display_name: string | null;
    full_name: string | null;
  };
}

export function useShiftSwaps(status?: string) {
  return useQuery({
    queryKey: ['shift-swaps', status],
    queryFn: async () => {
      let query = supabase
        .from('shift_swaps')
        .select('*')
        .order('original_date', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      } else {
        // By default, show open and pending swaps
        query = query.in('status', ['open', 'claimed', 'pending_approval']);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for requesters and claimers
      const requesterIds = [...new Set((data || []).map(s => s.requester_id))];
      const claimerIds = [...new Set((data || []).filter(s => s.claimer_id).map(s => s.claimer_id!))] as string[];
      const allUserIds = [...new Set([...requesterIds, ...claimerIds])];
      const locationIds = [...new Set((data || []).filter(s => s.location_id).map(s => s.location_id!))] as string[];

      const [profilesResult, locationsResult] = await Promise.all([
        allUserIds.length > 0
          ? supabase
              .from('employee_profiles')
              .select('user_id, display_name, full_name, photo_url')
              .in('user_id', allUserIds)
          : Promise.resolve({ data: [] }),
        locationIds.length > 0
          ? supabase
              .from('locations')
              .select('id, name')
              .in('id', locationIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(
        (profilesResult.data || []).map(p => [p.user_id, p])
      );
      const locationMap = new Map(
        (locationsResult.data || []).map(l => [l.id, l])
      );

      return (data || []).map(swap => ({
        ...swap,
        requester: profileMap.get(swap.requester_id),
        claimer: swap.claimer_id ? profileMap.get(swap.claimer_id) : undefined,
        location: swap.location_id ? locationMap.get(swap.location_id) : undefined,
      })) as ShiftSwap[];
    },
  });
}

export function useMySwaps() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-swaps', user?.id],
    queryFn: async () => {
      if (!user) return { requested: [], claimed: [] };

      const [requestedResult, claimedResult] = await Promise.all([
        supabase
          .from('shift_swaps')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('shift_swaps')
          .select('*')
          .eq('claimer_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      return {
        requested: (requestedResult.data || []) as ShiftSwap[],
        claimed: (claimedResult.data || []) as ShiftSwap[],
      };
    },
    enabled: !!user,
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-swap-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const requesterIds = [...new Set((data || []).map(s => s.requester_id))];
      const claimerIds = [...new Set((data || []).filter(s => s.claimer_id).map(s => s.claimer_id!))] as string[];
      const allUserIds = [...new Set([...requesterIds, ...claimerIds])];

      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name, photo_url')
          .in('user_id', allUserIds);

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        return (data || []).map(swap => ({
          ...swap,
          requester: profileMap.get(swap.requester_id),
          claimer: swap.claimer_id ? profileMap.get(swap.claimer_id) : undefined,
        })) as ShiftSwap[];
      }

      return data as unknown as ShiftSwap[];
    },
  });
}

export function useCreateSwap() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (swap: {
      original_date: string;
      original_start_time: string;
      original_end_time: string;
      location_id?: string;
      swap_type: 'swap' | 'cover' | 'giveaway';
      reason?: string;
      expires_at?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shift_swaps')
        .insert({
          ...swap,
          requester_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['my-swaps'] });
      toast.success('Shift swap posted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to post swap: ${error.message}`);
    },
  });
}

export function useClaimSwap() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      swapId,
      claimerDate,
      claimerStartTime,
      claimerEndTime,
    }: {
      swapId: string;
      claimerDate?: string;
      claimerStartTime?: string;
      claimerEndTime?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shift_swaps')
        .update({
          claimer_id: user.id,
          claimer_date: claimerDate || null,
          claimer_start_time: claimerStartTime || null,
          claimer_end_time: claimerEndTime || null,
          status: 'pending_approval',
        })
        .eq('id', swapId)
        .eq('status', 'open')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['my-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['pending-swap-approvals'] });
      toast.success('Shift claimed! Waiting for manager approval.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to claim: ${error.message}`);
    },
  });
}

export function useApproveSwap() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      swapId,
      approved,
      notes,
    }: {
      swapId: string;
      approved: boolean;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shift_swaps')
        .update({
          status: approved ? 'approved' : 'denied',
          manager_id: user.id,
          manager_notes: notes || null,
          approved_at: approved ? new Date().toISOString() : null,
        })
        .eq('id', swapId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['my-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['pending-swap-approvals'] });
      toast.success(data.status === 'approved' ? 'Swap approved!' : 'Swap denied');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process: ${error.message}`);
    },
  });
}

export function useCancelSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (swapId: string) => {
      const { error } = await supabase
        .from('shift_swaps')
        .update({ status: 'cancelled' })
        .eq('id', swapId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['my-swaps'] });
      toast.success('Swap cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });
}
