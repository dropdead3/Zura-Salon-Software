import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, startOfMonth, differenceInSeconds } from 'date-fns';

export interface LeadSourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export interface LeadFunnelStage {
  stage: string;
  count: number;
  dropoffRate: number;
}

export interface StylistLeadPerformance {
  userId: string;
  name: string;
  leadsAssigned: number;
  converted: number;
  conversionRate: number;
  avgResponseTime: number; // in minutes
  rebookingRate: number;
}

export interface LeadSummary {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  consultationsBooked: number;
  converted: number;
  lost: number;
  avgResponseTimeMinutes: number;
  consultationRate: number;
  conversionRate: number;
}

export type InquirySource = 
  | 'website_form'
  | 'google_business'
  | 'facebook_lead'
  | 'instagram_lead'
  | 'phone_call'
  | 'walk_in'
  | 'referral'
  | 'other';

export type InquiryStatus = 
  | 'new'
  | 'contacted'
  | 'assigned'
  | 'consultation_booked'
  | 'converted'
  | 'lost';

export interface SalonInquiry {
  id: string;
  source: InquirySource;
  source_detail: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_location: string | null;
  preferred_service: string | null;
  preferred_stylist: string | null;
  message: string | null;
  status: InquiryStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  response_time_seconds: number | null;
  consultation_booked_at: string | null;
  converted_at: string | null;
  first_service_revenue: number | null;
  phorest_client_id: string | null;
  match_method: 'auto_email' | 'auto_phone' | 'auto_both' | 'manual' | 'unmatched' | null;
  match_confidence: 'high' | 'medium' | 'ambiguous' | 'none' | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadAnalytics(
  locationId?: string, 
  dateRange: 'week' | 'month' | '3months' = 'month'
) {
  const today = new Date();
  let startDate: Date;
  
  switch (dateRange) {
    case 'week':
      startDate = startOfWeek(today);
      break;
    case 'month':
      startDate = startOfMonth(today);
      break;
    case '3months':
      startDate = subDays(today, 90);
      break;
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');

  // Fetch all leads for the period
  const leadsQuery = useQuery({
    queryKey: ['lead-analytics', locationId, startDateStr],
    queryFn: async () => {
      let query = supabase
        .from('salon_inquiries')
        .select('*')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false });

      if (locationId) {
        query = query.eq('preferred_location', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SalonInquiry[];
    },
  });

  // Fetch employee profiles for stylist names
  const profilesQuery = useQuery({
    queryKey: ['lead-analytics-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name');
      
      if (error) throw error;
      return new Map((data || []).map(p => [p.user_id, p.full_name]));
    },
  });

  const leads = leadsQuery.data || [];
  const profilesMap = profilesQuery.data || new Map();

  // Calculate summary stats
  const summary: LeadSummary = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => ['contacted', 'assigned', 'consultation_booked', 'converted'].includes(l.status)).length,
    consultationsBooked: leads.filter(l => ['consultation_booked', 'converted'].includes(l.status)).length,
    converted: leads.filter(l => l.status === 'converted').length,
    lost: leads.filter(l => l.status === 'lost').length,
    avgResponseTimeMinutes: 0,
    consultationRate: 0,
    conversionRate: 0,
  };

  // Calculate average response time
  const leadsWithResponseTime = leads.filter(l => l.response_time_seconds != null);
  if (leadsWithResponseTime.length > 0) {
    const totalSeconds = leadsWithResponseTime.reduce((sum, l) => sum + (l.response_time_seconds || 0), 0);
    summary.avgResponseTimeMinutes = Math.round(totalSeconds / leadsWithResponseTime.length / 60);
  }

  // Calculate rates
  if (summary.totalLeads > 0) {
    summary.consultationRate = (summary.consultationsBooked / summary.totalLeads) * 100;
    summary.conversionRate = (summary.converted / summary.totalLeads) * 100;
  }

  // Source breakdown
  const sourceCounts = new Map<string, number>();
  leads.forEach(lead => {
    sourceCounts.set(lead.source, (sourceCounts.get(lead.source) || 0) + 1);
  });

  const sourceBreakdown: LeadSourceBreakdown[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: summary.totalLeads > 0 ? (count / summary.totalLeads) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Funnel stages
  const funnelStages: LeadFunnelStage[] = [
    { 
      stage: 'New Leads', 
      count: summary.totalLeads, 
      dropoffRate: 0 
    },
    { 
      stage: 'Contacted', 
      count: summary.contacted, 
      dropoffRate: summary.totalLeads > 0 
        ? ((summary.totalLeads - summary.contacted) / summary.totalLeads) * 100 
        : 0 
    },
    { 
      stage: 'Consultation Booked', 
      count: summary.consultationsBooked,
      dropoffRate: summary.contacted > 0 
        ? ((summary.contacted - summary.consultationsBooked) / summary.contacted) * 100 
        : 0 
    },
    { 
      stage: 'Converted', 
      count: summary.converted,
      dropoffRate: summary.consultationsBooked > 0 
        ? ((summary.consultationsBooked - summary.converted) / summary.consultationsBooked) * 100 
        : 0 
    },
  ];

  // Stylist performance
  const stylistStats = new Map<string, {
    leadsAssigned: number;
    converted: number;
    totalResponseTime: number;
    responsesCount: number;
  }>();

  leads.forEach(lead => {
    if (!lead.assigned_to) return;
    
    const stats = stylistStats.get(lead.assigned_to) || {
      leadsAssigned: 0,
      converted: 0,
      totalResponseTime: 0,
      responsesCount: 0,
    };
    
    stats.leadsAssigned++;
    if (lead.status === 'converted') stats.converted++;
    if (lead.response_time_seconds != null) {
      stats.totalResponseTime += lead.response_time_seconds;
      stats.responsesCount++;
    }
    
    stylistStats.set(lead.assigned_to, stats);
  });

  const stylistPerformance: StylistLeadPerformance[] = Array.from(stylistStats.entries())
    .map(([userId, stats]) => ({
      userId,
      name: profilesMap.get(userId) || 'Unknown',
      leadsAssigned: stats.leadsAssigned,
      converted: stats.converted,
      conversionRate: stats.leadsAssigned > 0 
        ? (stats.converted / stats.leadsAssigned) * 100 
        : 0,
      avgResponseTime: stats.responsesCount > 0 
        ? Math.round(stats.totalResponseTime / stats.responsesCount / 60) 
        : 0,
      rebookingRate: 0, // Will be calculated when linked to Phorest
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

  return {
    leads,
    summary,
    sourceBreakdown,
    funnelStages,
    stylistPerformance,
    isLoading: leadsQuery.isLoading || profilesQuery.isLoading,
    error: leadsQuery.error || profilesQuery.error,
  };
}

// Helper to format source names for display
export function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    website_form: 'Website Form',
    google_business: 'Google Business',
    facebook_lead: 'Facebook',
    instagram_lead: 'Instagram',
    phone_call: 'Phone Call',
    walk_in: 'Walk-in',
    referral: 'Referral',
    other: 'Other',
  };
  return names[source] || source;
}

// Helper to get source color
export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    website_form: 'hsl(var(--primary))',
    google_business: 'hsl(217 91% 60%)',
    facebook_lead: 'hsl(221 83% 53%)',
    instagram_lead: 'hsl(328 85% 60%)',
    phone_call: 'hsl(142 76% 36%)',
    walk_in: 'hsl(38 92% 50%)',
    referral: 'hsl(262 83% 58%)',
    other: 'hsl(var(--muted-foreground))',
  };
  return colors[source] || 'hsl(var(--muted-foreground))';
}
