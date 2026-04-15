import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationCapacity {
  id: string;
  name: string;
  stylistCapacity: number | null;
  assistantRatio: number | null;
  currentStylists: number;
  currentAssistants: number;
  stylistsNeeded: number;
  assistantsNeeded: number;
  targetAssistants: number;
  totalNeeded: number;
  // Priority scoring
  priorityScore: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  capacityPercentage: number;
  weeklyAppointments: number;
}

export interface HiringCapacitySummary {
  locations: LocationCapacity[];
  totalStylistsNeeded: number;
  totalAssistantsNeeded: number;
  totalHiresNeeded: number;
  totalCurrentStylists: number;
  totalStylistCapacity: number;
  totalCurrentAssistants: number;
  totalTargetAssistants: number;
  isLoading: boolean;
}

// Helper to calculate priority score
function calculatePriorityScore(
  capacityPct: number, 
  appointmentVolume: number, 
  maxVolume: number
): number {
  // Understaffing severity (lower capacity = higher priority) - 40% weight
  const understaffingWeight = Math.max(0, (100 - capacityPct)) * 0.4;
  
  // Volume weight (higher volume = higher priority) - 40% weight
  const volumeWeight = maxVolume > 0 ? (appointmentVolume / maxVolume) * 40 : 0;
  
  // Combined score capped at 100
  return Math.min(100, Math.round(understaffingWeight + volumeWeight));
}

// Helper to get priority level from score
function getPriorityLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function useHiringCapacity(): HiringCapacitySummary {
  // Fetch locations with capacity settings
  const locationsQuery = useQuery({
    queryKey: ['locations-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, stylist_capacity, assistant_ratio')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch employee counts per location with roles
  const staffCountsQuery = useQuery({
    queryKey: ['staff-counts-by-location'],
    queryFn: async () => {
      // Get all active employees with their locations and roles
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('user_id, location_ids')
        .eq('is_active', true);

      if (empError) throw empError;

      // Get all stylist and assistant roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['stylist', 'stylist_assistant']);

      if (rolesError) throw rolesError;

      // Create a map of user_id to roles
      const userRolesMap = new Map<string, string[]>();
      roles?.forEach(r => {
        const existing = userRolesMap.get(r.user_id) || [];
        existing.push(r.role);
        userRolesMap.set(r.user_id, existing);
      });

      // Count stylists and assistants per location
      const locationCounts = new Map<string, { stylists: number; assistants: number }>();

      employees?.forEach(emp => {
        const userRoles = userRolesMap.get(emp.user_id) || [];
        const isStylist = userRoles.includes('stylist');
        const isAssistant = userRoles.includes('stylist_assistant');

        // Employee can be assigned to multiple locations
        (emp.location_ids || []).forEach((locId: string) => {
          const existing = locationCounts.get(locId) || { stylists: 0, assistants: 0 };
          if (isStylist) existing.stylists++;
          if (isAssistant) existing.assistants++;
          locationCounts.set(locId, existing);
        });
      });

      return locationCounts;
    },
  });

  // Fetch appointment counts for priority scoring (last 7 days)
  const appointmentsQuery = useQuery({
    queryKey: ['appointments-by-location-week'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('v_all_appointments' as any)
        .select('location_id')
        .gte('appointment_date', sevenDaysAgo.toISOString().split('T')[0]);

      if (error) throw error;

      // Count by location
      const counts = new Map<string, number>();
      ((data || []) as any[]).forEach((apt: any) => {
        if (apt.location_id) {
          counts.set(apt.location_id, (counts.get(apt.location_id) || 0) + 1);
        }
      });

      return counts;
    },
  });

  // Get max appointment volume for priority calculation
  const appointmentCounts = appointmentsQuery.data;
  const maxVolume = appointmentCounts 
    ? Math.max(...Array.from(appointmentCounts.values()), 1) 
    : 1;

  // Combine data and calculate needs
  const locations: LocationCapacity[] = (locationsQuery.data || []).map(loc => {
    const counts = staffCountsQuery.data?.get(loc.id) || { stylists: 0, assistants: 0 };
    const stylistCapacity = loc.stylist_capacity;
    const assistantRatio = loc.assistant_ratio ?? 0.5;

    const currentStylists = counts.stylists;
    const currentAssistants = counts.assistants;

    // Calculate stylists needed
    const stylistsNeeded = stylistCapacity !== null 
      ? Math.max(0, stylistCapacity - currentStylists) 
      : 0;

    // Calculate target assistants based on current stylists * ratio
    // Use capacity if we're understaffed to show true need
    const stylistsForCalc = stylistCapacity !== null 
      ? Math.max(currentStylists, stylistCapacity) 
      : currentStylists;
    const targetAssistants = Math.ceil(stylistsForCalc * assistantRatio);
    const assistantsNeeded = Math.max(0, targetAssistants - currentAssistants);

    // Calculate capacity percentage for priority
    const totalTarget = (stylistCapacity || 0) + targetAssistants;
    const currentTotal = currentStylists + currentAssistants;
    const capacityPercentage = totalTarget > 0 
      ? Math.round((currentTotal / totalTarget) * 100) 
      : 100;

    // Get weekly appointments for this location
    const weeklyAppointments = appointmentCounts?.get(loc.id) || 0;

    // Calculate priority score
    const priorityScore = stylistCapacity !== null 
      ? calculatePriorityScore(capacityPercentage, weeklyAppointments, maxVolume)
      : 0;
    const priorityLevel = getPriorityLevel(priorityScore);

    return {
      id: loc.id,
      name: loc.name,
      stylistCapacity,
      assistantRatio,
      currentStylists,
      currentAssistants,
      stylistsNeeded,
      assistantsNeeded,
      targetAssistants,
      totalNeeded: stylistsNeeded + assistantsNeeded,
      priorityScore,
      priorityLevel,
      capacityPercentage,
      weeklyAppointments,
    };
  });

  // Sort by priority score (highest first)
  const sortedLocations = [...locations].sort((a, b) => b.priorityScore - a.priorityScore);

  // Calculate totals
  const totalStylistsNeeded = locations.reduce((sum, loc) => sum + loc.stylistsNeeded, 0);
  const totalAssistantsNeeded = locations.reduce((sum, loc) => sum + loc.assistantsNeeded, 0);
  const totalCurrentStylists = locations.reduce((sum, loc) => sum + loc.currentStylists, 0);
  const totalStylistCapacity = locations.reduce((sum, loc) => sum + (loc.stylistCapacity || 0), 0);
  const totalCurrentAssistants = locations.reduce((sum, loc) => sum + loc.currentAssistants, 0);
  const totalTargetAssistants = locations.reduce((sum, loc) => sum + loc.targetAssistants, 0);

  return {
    locations: sortedLocations,
    totalStylistsNeeded,
    totalAssistantsNeeded,
    totalHiresNeeded: totalStylistsNeeded + totalAssistantsNeeded,
    totalCurrentStylists,
    totalStylistCapacity,
    totalCurrentAssistants,
    totalTargetAssistants,
    isLoading: locationsQuery.isLoading || staffCountsQuery.isLoading || appointmentsQuery.isLoading,
  };
}
