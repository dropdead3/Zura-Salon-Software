import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useMemo, useEffect } from 'react';
import { format, getDay } from 'date-fns';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';

export interface AssistantTimeBlock {
  id: string;
  organization_id: string;
  location_id: string;
  date: string;
  start_time: string;
  end_time: string;
  requesting_user_id: string;
  assistant_user_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined profile data
  requesting_profile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
  assistant_profile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
}

export interface SuggestedBlock {
  start_time: string;
  end_time: string;
  label: string;
  appointmentIds: string[];
}

/**
 * Fetch assistant time blocks for a given date and location.
 */
export function useAssistantTimeBlocks(
  date: Date | null,
  locationId: string | null,
  organizationId: string | null,
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const dateStr = date ? format(date, 'yyyy-MM-dd') : null;

  const { data: timeBlocks = [], isLoading } = useQuery({
    queryKey: ['assistant-time-blocks', dateStr, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistant_time_blocks')
        .select('*')
        .eq('date', dateStr!)
        .eq('location_id', locationId!);

      if (error) throw error;

      // Fetch profiles for requesting users and assistants
      const userIds = new Set<string>();
      (data || []).forEach(b => {
        userIds.add(b.requesting_user_id);
        if (b.assistant_user_id) userIds.add(b.assistant_user_id);
      });

      if (userIds.size === 0) return [] as AssistantTimeBlock[];

      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map(b => ({
        ...b,
        requesting_profile: profileMap.get(b.requesting_user_id) || undefined,
        assistant_profile: b.assistant_user_id ? profileMap.get(b.assistant_user_id) || undefined : undefined,
      })) as AssistantTimeBlock[];
    },
    enabled: !!dateStr && !!locationId,
    staleTime: 30_000,
  });

  // Realtime subscription — invalidate on any change to assistant_time_blocks
  useEffect(() => {
    if (!dateStr || !locationId) return;

    const channel = supabase
      .channel(`assistant-blocks-${locationId}-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assistant_time_blocks',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks'] });
          queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks-range'] });
          queryClient.invalidateQueries({ queryKey: ['assistant-pending-blocks'] });
          queryClient.invalidateQueries({ queryKey: ['assistant-conflicts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr, locationId, queryClient]);

  // Create a new time block request
  const createBlock = useMutation({
    mutationFn: async (params: {
      start_time: string;
      end_time: string;
      assistant_user_id?: string | null;
      notes?: string;
    }) => {
      if (!organizationId || !locationId || !dateStr || !user?.id) {
        throw new Error('Missing required context');
      }
      const { data, error } = await supabase
        .from('assistant_time_blocks')
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          date: dateStr,
          start_time: params.start_time,
          end_time: params.end_time,
          requesting_user_id: user.id,
          assistant_user_id: params.assistant_user_id || null,
          status: params.assistant_user_id ? 'confirmed' : 'requested',
          notes: params.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to the assigned assistant
      if (params.assistant_user_id && params.assistant_user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: params.assistant_user_id,
          type: 'assistant_time_block',
          title: 'Assistant Coverage Requested',
          message: `You've been requested as an assistant on ${dateStr} from ${params.start_time.slice(0, 5)} to ${params.end_time.slice(0, 5)}`,
          metadata: { time_block_id: data.id, requesting_user_id: user.id },
        }).then(({ error: notifErr }) => {
          if (notifErr) console.warn('[TimeBlockNotification] Failed:', notifErr);
        });
      }

      // Auto-notify pool: when no specific assistant is assigned, notify all
      // assistants scheduled at this location on this date
      if (!params.assistant_user_id && dateStr && locationId) {
        try {
          const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const blockDate = new Date(dateStr + 'T12:00:00');
          const dayOfWeek = DAY_KEYS[getDay(blockDate)];

          // Find assistant role users
          const { data: assistantRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['stylist_assistant', 'assistant']);

          if (assistantRoles?.length) {
            const assistantUserIds = assistantRoles.map(r => r.user_id);

            // Find which of them are scheduled at this location on this day
            const { data: schedules } = await supabase
              .from('employee_location_schedules')
              .select('user_id')
              .in('user_id', assistantUserIds)
              .eq('location_id', locationId)
              .contains('work_days', [dayOfWeek]);

            const targetUserIds = (schedules || [])
              .map(s => s.user_id)
              .filter(uid => uid !== user.id);

            if (targetUserIds.length > 0) {
              const notifications = targetUserIds.map(uid => ({
                user_id: uid,
                type: 'assistant_time_block',
                title: 'Assistant Coverage Available',
                message: `A coverage request is available on ${dateStr} from ${params.start_time.slice(0, 5)} to ${params.end_time.slice(0, 5)}`,
                metadata: { time_block_id: data.id, requesting_user_id: user.id },
              }));
              await supabase.from('notifications').insert(notifications);
            }
          }
        } catch (poolErr) {
          console.warn('[TimeBlockPoolNotify] Failed:', poolErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks', dateStr, locationId] });
      queryClient.invalidateQueries({ queryKey: ['assistant-conflicts'] });
      toast.success('Assistant time block created');
    },
    onError: () => {
      toast.error('Failed to create time block');
    },
  });

  // Update a time block (status, assistant assignment)
  const updateBlock = useMutation({
    mutationFn: async (params: { id: string; status?: string; assistant_user_id?: string | null }) => {
      const { error } = await supabase
        .from('assistant_time_blocks')
        .update({
          ...(params.status && { status: params.status }),
          ...(params.assistant_user_id !== undefined && { assistant_user_id: params.assistant_user_id }),
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks', dateStr, locationId] });
      queryClient.invalidateQueries({ queryKey: ['assistant-conflicts'] });
    },
    onError: () => {
      toast.error('Failed to update time block');
    },
  });

  // Delete a time block
  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assistant_time_blocks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks', dateStr, locationId] });
      queryClient.invalidateQueries({ queryKey: ['assistant-conflicts'] });
      toast.success('Time block removed');
    },
    onError: () => {
      toast.error('Failed to remove time block');
    },
  });

  return {
    timeBlocks,
    isLoading,
    createBlock: createBlock.mutate,
    updateBlock: updateBlock.mutate,
    deleteBlock: deleteBlock.mutate,
    isCreating: createBlock.isPending,
  };
}

/**
 * Generate smart suggested time blocks from a stylist's appointments for the day.
 * Merges adjacent appointments within a 15-minute gap.
 */
export function useSuggestedBlocks(
  appointments: PhorestAppointment[],
  stylistUserId: string | null,
  dateStr: string | null,
): SuggestedBlock[] {
  return useMemo(() => {
    if (!stylistUserId || !dateStr) return [];

    const stylistAppts = appointments
      .filter(a =>
        a.stylist_user_id === stylistUserId &&
        a.appointment_date === dateStr &&
        !['cancelled', 'no_show'].includes(a.status) &&
        !['Block', 'Break'].includes(a.service_category || '')
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (stylistAppts.length === 0) return [];

    // Merge adjacent appointments within 15 minutes
    const merged: SuggestedBlock[] = [];
    let current: SuggestedBlock = {
      start_time: stylistAppts[0].start_time,
      end_time: stylistAppts[0].end_time,
      label: `${stylistAppts[0].client_name} - ${stylistAppts[0].service_name}`,
      appointmentIds: [stylistAppts[0].id],
    };

    for (let i = 1; i < stylistAppts.length; i++) {
      const apt = stylistAppts[i];
      const currentEndMinutes = parseTime(current.end_time);
      const nextStartMinutes = parseTime(apt.start_time);
      const gap = nextStartMinutes - currentEndMinutes;

      if (gap <= 15) {
        // Merge
        current.end_time = apt.end_time > current.end_time ? apt.end_time : current.end_time;
        current.appointmentIds.push(apt.id);
        current.label = `${current.appointmentIds.length} appointments`;
      } else {
        merged.push(current);
        current = {
          start_time: apt.start_time,
          end_time: apt.end_time,
          label: `${apt.client_name} - ${apt.service_name}`,
          appointmentIds: [apt.id],
        };
      }
    }
    merged.push(current);

    return merged;
  }, [appointments, stylistUserId, dateStr]);
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Fetch assistant time blocks for a date range and location.
 * Used by WeekView and AgendaView.
 */
export function useAssistantTimeBlocksRange(
  startDate: string | null,
  endDate: string | null,
  locationId: string | null,
) {
  const { data: timeBlocks = [], isLoading } = useQuery({
    queryKey: ['assistant-time-blocks-range', startDate, endDate, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistant_time_blocks')
        .select('*')
        .gte('date', startDate!)
        .lte('date', endDate!)
        .eq('location_id', locationId!);

      if (error) throw error;

      const userIds = new Set<string>();
      (data || []).forEach(b => {
        userIds.add(b.requesting_user_id);
        if (b.assistant_user_id) userIds.add(b.assistant_user_id);
      });

      if (userIds.size === 0) return [] as AssistantTimeBlock[];

      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map(b => ({
        ...b,
        requesting_profile: profileMap.get(b.requesting_user_id) || undefined,
        assistant_profile: b.assistant_user_id ? profileMap.get(b.assistant_user_id) || undefined : undefined,
      })) as AssistantTimeBlock[];
    },
    enabled: !!startDate && !!endDate && !!locationId,
    staleTime: 30_000,
  });

  return { timeBlocks, isLoading };
}

/**
 * Fetch pending assistant blocks relevant to the current user.
 * Returns blocks where the user is either a requester with unassigned blocks
 * or an assigned assistant with 'requested' status.
 */
export function useMyPendingAssistantBlocks(
  userId: string | null,
  locationId: string | null,
) {
  const { data: pendingBlocks = [], isLoading } = useQuery({
    queryKey: ['assistant-pending-blocks', userId, locationId],
    queryFn: async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Fetch blocks where user is assigned assistant with status 'requested'
      const { data: assistBlocks, error: err1 } = await supabase
        .from('assistant_time_blocks')
        .select('*')
        .eq('assistant_user_id', userId!)
        .eq('status', 'requested')
        .eq('location_id', locationId!)
        .gte('date', todayStr);

      if (err1) throw err1;

      // Fetch blocks where user is requester and no assistant assigned
      const { data: reqBlocks, error: err2 } = await supabase
        .from('assistant_time_blocks')
        .select('*')
        .eq('requesting_user_id', userId!)
        .is('assistant_user_id', null)
        .eq('status', 'requested')
        .eq('location_id', locationId!)
        .gte('date', todayStr);

      if (err2) throw err2;

      const all = [...(assistBlocks || []), ...(reqBlocks || [])];
      // Deduplicate by id
      const unique = Array.from(new Map(all.map(b => [b.id, b])).values());

      // Fetch profiles
      const userIds = new Set<string>();
      unique.forEach(b => {
        userIds.add(b.requesting_user_id);
        if (b.assistant_user_id) userIds.add(b.assistant_user_id);
      });

      if (userIds.size === 0) return [] as AssistantTimeBlock[];

      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return unique.map(b => ({
        ...b,
        requesting_profile: profileMap.get(b.requesting_user_id) || undefined,
        assistant_profile: b.assistant_user_id ? profileMap.get(b.assistant_user_id) || undefined : undefined,
      })) as AssistantTimeBlock[];
    },
    enabled: !!userId && !!locationId,
    staleTime: 10_000,
  });

  return { pendingBlocks, pendingCount: pendingBlocks.length, isLoading };
}
