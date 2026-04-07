import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SalonInquiry, InquiryStatus, InquirySource } from './useLeadAnalytics';

export interface LeadWithAssignee extends SalonInquiry {
  assignee_name?: string;
  assigner_name?: string;
  preferred_location_name?: string;
}

export interface LeadFilters {
  status?: InquiryStatus | 'all';
  source?: InquirySource | 'all';
  location?: string | 'all';
  assignedTo?: string | 'all' | 'unassigned';
  search?: string;
}

export function useLeadInbox(filters: LeadFilters = {}) {
  const queryClient = useQueryClient();

  // Fetch all leads with joined data
  const leadsQuery = useQuery({
    queryKey: ['lead-inbox', filters],
    queryFn: async () => {
      let query = supabase
        .from('salon_inquiries')
        .select(`
          *,
          assignee:assigned_to(full_name),
          assigner:assigned_by(full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.source && filters.source !== 'all') {
        query = query.eq('source', filters.source);
      }
      if (filters.location && filters.location !== 'all') {
        query = query.eq('preferred_location', filters.location);
      }
      if (filters.assignedTo === 'unassigned') {
        query = query.is('assigned_to', null);
      } else if (filters.assignedTo && filters.assignedTo !== 'all') {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      // Transform the data to flatten the nested objects
      return (data || []).map((lead: any) => ({
        ...lead,
        assignee_name: lead.assignee?.full_name || null,
        assigner_name: lead.assigner?.full_name || null,
        assignee: undefined,
        assigner: undefined,
      })) as LeadWithAssignee[];
    },
    staleTime: 30000,
  });

  // Fetch location names for display
  const locationsQuery = useQuery({
    queryKey: ['lead-inbox-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name');
      if (error) throw error;
      return new Map((data || []).map(l => [l.id, l.name]));
    },
  });

  // Fetch stylists for assignment dropdown
  const stylistsQuery = useQuery({
    queryKey: ['lead-inbox-stylists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, stylist_level, location_id')
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Assign lead mutation
  const assignMutation = useMutation({
    mutationFn: async ({ 
      leadId, 
      assignToUserId, 
      assignedByUserId 
    }: { 
      leadId: string; 
      assignToUserId: string; 
      assignedByUserId: string;
    }) => {
      const { error } = await supabase
        .from('salon_inquiries')
        .update({
          assigned_to: assignToUserId,
          assigned_at: new Date().toISOString(),
          assigned_by: assignedByUserId,
          status: 'assigned',
        })
        .eq('id', leadId);

      if (error) throw error;

      // Log the activity
      await supabase.from('inquiry_activity_log').insert({
        inquiry_id: leadId,
        action: 'assigned',
        performed_by: assignedByUserId,
        notes: `Lead assigned to stylist`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
      toast.success('Lead assigned successfully');
    },
    onError: (error) => {
      console.error('Assignment failed:', error);
      toast.error('Failed to assign lead');
    },
  });

  // Claim lead mutation (self-assign)
  const claimMutation = useMutation({
    mutationFn: async ({ 
      leadId, 
      userId 
    }: { 
      leadId: string; 
      userId: string;
    }) => {
      const { error } = await supabase
        .from('salon_inquiries')
        .update({
          assigned_to: userId,
          assigned_at: new Date().toISOString(),
          assigned_by: null, // Self-claimed
          status: 'assigned',
        })
        .eq('id', leadId);

      if (error) throw error;

      // Log the activity
      await supabase.from('inquiry_activity_log').insert({
        inquiry_id: leadId,
        action: 'claimed',
        performed_by: userId,
        notes: 'Lead self-claimed by stylist',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
      toast.success('Lead claimed successfully');
    },
    onError: (error) => {
      console.error('Claim failed:', error);
      toast.error('Failed to claim lead');
    },
  });

  // Update lead status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      leadId, 
      status, 
      userId,
      additionalData = {}
    }: { 
      leadId: string; 
      status: InquiryStatus; 
      userId: string;
      additionalData?: Partial<SalonInquiry>;
    }) => {
      const updateData: any = {
        status,
        ...additionalData,
      };

      // Set timestamps based on status
      if (status === 'contacted' && !additionalData.response_time_seconds) {
        // Calculate response time from created_at
        const { data: lead } = await supabase
          .from('salon_inquiries')
          .select('created_at')
          .eq('id', leadId)
          .single();
        
        if (lead) {
          const createdAt = new Date(lead.created_at);
          const now = new Date();
          updateData.response_time_seconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
        }
      }
      if (status === 'consultation_booked') {
        updateData.consultation_booked_at = new Date().toISOString();
      }
      if (status === 'converted') {
        updateData.converted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('salon_inquiries')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;

      // Log the activity
      await supabase.from('inquiry_activity_log').insert({
        inquiry_id: leadId,
        action: `status_changed_to_${status}`,
        performed_by: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
      toast.success('Lead status updated');
    },
    onError: (error) => {
      console.error('Status update failed:', error);
      toast.error('Failed to update lead status');
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ 
      leadId, 
      note, 
      userId 
    }: { 
      leadId: string; 
      note: string; 
      userId: string;
    }) => {
      const { error } = await supabase.from('inquiry_activity_log').insert({
        inquiry_id: leadId,
        action: 'note_added',
        performed_by: userId,
        notes: note,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activity'] });
      toast.success('Note added');
    },
    onError: (error) => {
      console.error('Add note failed:', error);
      toast.error('Failed to add note');
    },
  });

  // Fetch lead activity log
  const useLeadActivity = (leadId: string) => {
    return useQuery({
      queryKey: ['lead-activity', leadId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('inquiry_activity_log')
          .select(`
            *,
            performer:performed_by(full_name)
          `)
          .eq('inquiry_id', leadId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((item: any) => ({
          ...item,
          performer_name: item.performer?.full_name || null,
        }));
      },
      enabled: !!leadId,
    });
  };

  // Filter leads by search
  let leads = leadsQuery.data || [];
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    leads = leads.filter(lead =>
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(searchLower)
    );
  }

  // Add location names to leads
  const locationsMap = locationsQuery.data;
  if (locationsMap) {
    leads = leads.map(lead => ({
      ...lead,
      preferred_location_name: lead.preferred_location 
        ? locationsMap.get(lead.preferred_location) || lead.preferred_location
        : null,
    }));
  }

  return {
    leads,
    stylists: stylistsQuery.data || [],
    locations: locationsQuery.data || new Map(),
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    assignLead: assignMutation.mutateAsync,
    claimLead: claimMutation.mutateAsync,
    updateLeadStatus: updateStatusMutation.mutateAsync,
    addNote: addNoteMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    isClaiming: claimMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    useLeadActivity,
    refetch: leadsQuery.refetch,
  };
}

// Get counts by status for tab badges
export function useLeadCounts() {
  return useQuery({
    queryKey: ['lead-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_inquiries')
        .select('status, assigned_to');

      if (error) throw error;

      const leads = data || [];
      return {
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        unassigned: leads.filter(l => !l.assigned_to && l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        assigned: leads.filter(l => l.status === 'assigned').length,
        consultationBooked: leads.filter(l => l.status === 'consultation_booked').length,
        converted: leads.filter(l => l.status === 'converted').length,
        lost: leads.filter(l => l.status === 'lost').length,
      };
    },
    staleTime: 30000,
  });
}
