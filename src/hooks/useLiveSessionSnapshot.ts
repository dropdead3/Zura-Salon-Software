import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { applyLocationFilter } from '@/lib/locationFilter';
import { formatFullDisplayName } from '@/lib/utils';

interface ActiveStylist {
  name: string;
  photoUrl: string | null;
}

export interface ConflictPeer {
  stylistName: string;
  locationName: string | null;
  startTime: string;
  endTime: string;
}

export interface StylistDetail {
  name: string;
  photoUrl: string | null;
  currentService: string | null;
  currentEndTime: string | null;
  lastEndTime: string; // wrap-up estimate
  currentApptIndex: number; // 1-based
  totalAppts: number;
  assistedBy: string[];
  clientName: string | null;
  locationId: string | null;
  locationName: string | null;
  isUnmapped?: boolean;
  phorestStaffId?: string | null;
  /** Set when this client has another concurrent appointment with a different staff/location. */
  conflictPeers?: ConflictPeer[];
}

/** Truncate a Phorest staff ID to a recognizable prefix for support traceability. */
function truncateStaffId(staffId: string): string {
  if (!staffId) return '';
  return staffId.length > 10 ? `${staffId.slice(0, 8)}…` : staffId;
}

function unmappedLabel(staffId: string): string {
  return `Unmapped (${truncateStaffId(staffId)})`;
}

interface LiveSessionSnapshot {
  inSessionCount: number;
  activeStylistCount: number;
  activeAssistantCount: number;
  stylists: ActiveStylist[];
  stylistDetails: StylistDetail[];
  dayHadAppointments: boolean;
  firstAppointmentTime: string | null;
  isLoading: boolean;
}

export function useLiveSessionSnapshot(locationId?: string, enabled: boolean = true): LiveSessionSnapshot {
  const { data, isLoading } = useQuery({
    queryKey: ['live-session-snapshot', locationId ?? 'all'],
    enabled,
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = format(new Date(), 'HH:mm:ss');

      // Get today's appointments where current time falls between start and end
      const activeQuery = applyLocationFilter(
        supabase
          .from('v_all_appointments' as any)
          .select('id, phorest_staff_id, phorest_client_id, start_time, end_time, service_name, client_name, location_id')
          .eq('appointment_date', today)
          .lte('start_time', now)
          .gt('end_time', now)
          .is('deleted_at', null)
          .not('status', 'in', '("cancelled","no_show")') as any,
        locationId,
      );
      const { data: appointments, error } = await activeQuery;

      // Resolve location names for grouping
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name');
      const locationNameMap = new Map<string, string>(
        ((locations || []) as any[]).map((l: any) => [l.id, l.name])
      );

      if (error) throw error;
      if (!appointments || appointments.length === 0) {
        // Check if the day had any completed/checked-in appointments
        const completedQuery = applyLocationFilter(
          supabase
            .from('v_all_appointments' as any)
            .select('id', { count: 'exact', head: true })
            .eq('appointment_date', today)
            .in('status', ['completed', 'checked_in'])
            .is('deleted_at', null) as any,
          locationId,
        );
        const { count } = await completedQuery;
        const dayHadAppointments = (count ?? 0) > 0;

        // If day hasn't concluded, check for upcoming appointments
        let firstAppointmentTime: string | null = null;
        if (!dayHadAppointments) {
          const upcomingQuery = applyLocationFilter(
            supabase
              .from('v_all_appointments' as any)
              .select('start_time')
              .eq('appointment_date', today)
              .is('deleted_at', null)
              .not('status', 'in', '("cancelled","no_show")') as any,
            locationId,
          );
          const { data: upcoming } = await (upcomingQuery as any).order('start_time', { ascending: true }).limit(1);
          if (upcoming && upcoming.length > 0) {
            firstAppointmentTime = upcoming[0].start_time;
          }
        }

        return { inSessionCount: 0, activeStylistCount: 0, activeAssistantCount: 0, stylists: [], stylistDetails: [], dayHadAppointments, firstAppointmentTime };
      }

      const inSessionCount = appointments.length;

      // Deduplicate staff IDs
      const uniqueStaffIds = [...new Set(
        appointments
          .map(a => a.phorest_staff_id)
          .filter(Boolean) as string[]
      )];

      if (uniqueStaffIds.length === 0) {
        return { inSessionCount, activeStylistCount: 0, activeAssistantCount: 0, stylists: [], stylistDetails: [], dayHadAppointments: true, firstAppointmentTime: null };
      }

      // Resolve staff to user profiles via phorest_staff_mapping (include phorest_staff_name)
      const { data: staffMappings, error: mappingError } = await supabase
        .from('v_all_staff' as any)
        .select('phorest_staff_id, user_id, phorest_staff_name')
        .in('phorest_staff_id', uniqueStaffIds);

      if (mappingError) throw mappingError;

      const staffToUser = new Map<string, string>();
      const staffToName = new Map<string, string>();
      ((staffMappings || []) as any[]).forEach((m: any) => {
        if (m.user_id) staffToUser.set(m.phorest_staff_id, m.user_id);
        if (m.phorest_staff_name) staffToName.set(m.phorest_staff_id, m.phorest_staff_name);
      });

      const userIds = [...new Set(staffToUser.values())];

      // Get employee profiles for mapped users (may be empty)
      let profileMap = new Map<string, { user_id: string; full_name: string | null; display_name: string | null; photo_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, photo_url')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        profileMap = new Map(
          ((profiles || []) as any[]).map((p: any) => [p.user_id, p])
        );
      }

      // Build stylists array using name waterfall
      const stylists: ActiveStylist[] = uniqueStaffIds.map(staffId => {
        const userId = staffToUser.get(staffId);
        const profile = userId ? profileMap.get(userId) : null;
        const phorestName = staffToName.get(staffId);
        const name = profile
          ? formatFullDisplayName(profile.full_name || '', profile.display_name)
          : (phorestName ? phorestName : unmappedLabel(staffId));
        return { name, photoUrl: profile?.photo_url || null };
      });

      // Get ALL of today's appointments for active staff to find wrap-up times
      const allTodayQuery = applyLocationFilter(
        supabase
          .from('v_all_appointments' as any)
          .select('id, phorest_staff_id, start_time, end_time, service_name')
          .eq('appointment_date', today)
          .in('phorest_staff_id', uniqueStaffIds)
          .is('deleted_at', null)
          .not('status', 'in', '("cancelled","no_show")') as any,
        locationId,
      );
      const { data: allTodayAppts, error: allError } = await allTodayQuery;

      if (allError) throw allError;

      // Get assistant assignments for currently active appointments
      const activeApptIds = appointments.map(a => a.id).filter(Boolean);
      let assistantMap = new Map<string, string[]>(); // appointment_id -> assistant names[]
      if (activeApptIds.length > 0) {
        const { data: assistants } = await supabase
          .from('appointment_assistants')
          .select('appointment_id, assistant_user_id')
          .in('appointment_id', activeApptIds);

        if (assistants && assistants.length > 0) {
          const assistantUserIds = [...new Set(assistants.map(a => a.assistant_user_id))];
          const { data: assistantProfiles } = await supabase
            .from('employee_profiles')
            .select('user_id, full_name, display_name')
            .in('user_id', assistantUserIds);

          const assistantProfileMap = new Map(
            ((assistantProfiles || []) as any[]).map((p: any) => [p.user_id, formatFullDisplayName(p.full_name || '', p.display_name)])
          );

          assistants.forEach(a => {
            const name = assistantProfileMap.get(a.assistant_user_id);
            if (name) {
              if (!assistantMap.has(a.appointment_id)) {
                assistantMap.set(a.appointment_id, []);
              }
              assistantMap.get(a.appointment_id)!.push(name);
            }
          });
        }
      }

      // Pre-compute conflict groups: same client + time across different staff or locations.
      // Fetch ACROSS all locations (ignoring locationId filter) so cross-location double-bookings surface.
      const activeClientIds = [...new Set(
        (appointments as any[]).map(a => a.phorest_client_id).filter(Boolean)
      )];
      const conflictIndex = new Map<string, any[]>();
      if (activeClientIds.length > 0) {
        const { data: crossLocationActive } = await supabase
          .from('v_all_appointments' as any)
          .select('id, phorest_staff_id, phorest_client_id, start_time, end_time, location_id')
          .eq('appointment_date', today)
          .lte('start_time', now)
          .gt('end_time', now)
          .is('deleted_at', null)
          .not('status', 'in', '("cancelled","no_show")')
          .in('phorest_client_id', activeClientIds);

        for (const appt of (crossLocationActive || []) as any[]) {
          const cid = appt.phorest_client_id;
          if (!cid) continue;
          const key = `${cid}::${appt.start_time}::${appt.end_time}`;
          if (!conflictIndex.has(key)) conflictIndex.set(key, []);
          conflictIndex.get(key)!.push(appt);
        }
      }

      // Resolve any peer staff IDs (from cross-location conflicts) that we haven't already resolved
      const peerStaffIds = new Set<string>();
      for (const group of conflictIndex.values()) {
        for (const appt of group) {
          if (appt.phorest_staff_id && !staffToName.has(appt.phorest_staff_id) && !staffToUser.has(appt.phorest_staff_id)) {
            peerStaffIds.add(appt.phorest_staff_id);
          }
        }
      }
      if (peerStaffIds.size > 0) {
        const { data: peerMappings } = await supabase
          .from('v_all_staff' as any)
          .select('phorest_staff_id, user_id, phorest_staff_name')
          .in('phorest_staff_id', [...peerStaffIds]);
        const peerUserIds: string[] = [];
        ((peerMappings || []) as any[]).forEach((m: any) => {
          if (m.user_id) {
            staffToUser.set(m.phorest_staff_id, m.user_id);
            peerUserIds.push(m.user_id);
          }
          if (m.phorest_staff_name) staffToName.set(m.phorest_staff_id, m.phorest_staff_name);
        });
        const missingProfileIds = peerUserIds.filter(uid => !profileMap.has(uid));
        if (missingProfileIds.length > 0) {
          const { data: peerProfiles } = await supabase
            .from('employee_profiles')
            .select('user_id, full_name, display_name, photo_url')
            .in('user_id', missingProfileIds);
          ((peerProfiles || []) as any[]).forEach((p: any) => profileMap.set(p.user_id, p));
        }
      }

      // Build per-stylist details
      const stylistDetailsMap = new Map<string, StylistDetail>();

      for (const staffId of uniqueStaffIds) {
        const userId = staffToUser.get(staffId);
        const profile = userId ? profileMap.get(userId) : null;
        const phorestName = staffToName.get(staffId);
        const isUnmapped = !profile && !phorestName;
        const name = profile
          ? formatFullDisplayName(profile.full_name || '', profile.display_name)
          : (phorestName ? phorestName : unmappedLabel(staffId));
        const photoUrl = profile?.photo_url || null;

        // All appointments for this staff today, sorted chronologically
        const allForStaff = (allTodayAppts || [])
          .filter(a => a.phorest_staff_id === staffId)
          .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

        const totalAppts = allForStaff.length;

        // Current in-session appointment (pick latest start among active)
        const currentAppts = appointments
          .filter(a => a.phorest_staff_id === staffId)
          .sort((a, b) => (b.start_time || '').localeCompare(a.start_time || ''));
        const current = currentAppts[0];

        // Find 1-based index of current appointment in the day's schedule
        const currentApptIndex = current
          ? allForStaff.findIndex(a => a.start_time === current.start_time && a.end_time === current.end_time) + 1
          : 1;

        // Last end time of the day
        const lastEndTime = [...allForStaff].sort((a, b) => (b.end_time || '').localeCompare(a.end_time || ''))[0]?.end_time || current?.end_time || '';

        // Get assistant name for current appointment
        const assistedBy = current ? (assistantMap.get(current.id) || []) : [];

        const apptLocationId = (current as any)?.location_id || null;

        // Compute conflict peers for current appointment (same client + time, different staff/location)
        let conflictPeers: ConflictPeer[] | undefined;
        const currentClientId = (current as any)?.phorest_client_id;
        if (current && currentClientId) {
          const key = `${currentClientId}::${current.start_time}::${current.end_time}`;
          const group = conflictIndex.get(key) || [];
          const peers = group.filter((a: any) =>
            a.phorest_staff_id !== staffId || a.location_id !== apptLocationId
          );
          if (peers.length > 0) {
            conflictPeers = peers.map((p: any) => {
              const peerProfile = staffToUser.get(p.phorest_staff_id)
                ? profileMap.get(staffToUser.get(p.phorest_staff_id)!)
                : null;
              const peerPhorestName = staffToName.get(p.phorest_staff_id);
              const peerName = peerProfile
                ? formatFullDisplayName(peerProfile.full_name || '', peerProfile.display_name)
                : (peerPhorestName ? peerPhorestName : unmappedLabel(p.phorest_staff_id));
              return {
                stylistName: peerName,
                locationName: p.location_id ? (locationNameMap.get(p.location_id) || null) : null,
                startTime: p.start_time,
                endTime: p.end_time,
              };
            });
          }
        }

        stylistDetailsMap.set(staffId, {
          name,
          photoUrl,
          currentService: current?.service_name || null,
          currentEndTime: current?.end_time || null,
          lastEndTime,
          currentApptIndex: currentApptIndex || 1,
          totalAppts,
          assistedBy,
          clientName: (current as any)?.client_name || null,
          locationId: apptLocationId,
          locationName: apptLocationId ? (locationNameMap.get(apptLocationId) || null) : null,
          isUnmapped,
          phorestStaffId: staffId,
          conflictPeers,
        });
      }

      const stylistDetails = [...stylistDetailsMap.values()]
        .sort((a, b) => a.lastEndTime.localeCompare(b.lastEndTime));

      // Count unique assistants currently active
      const uniqueAssistantNames = new Set<string>();
      stylistDetails.forEach(d => d.assistedBy.forEach(a => uniqueAssistantNames.add(a)));

      return {
        inSessionCount,
        activeStylistCount: uniqueStaffIds.length,
        activeAssistantCount: uniqueAssistantNames.size,
        stylists,
        stylistDetails,
        dayHadAppointments: true,
        firstAppointmentTime: null,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return {
    inSessionCount: data?.inSessionCount ?? 0,
    activeStylistCount: data?.activeStylistCount ?? 0,
    activeAssistantCount: data?.activeAssistantCount ?? 0,
    stylists: data?.stylists ?? [],
    stylistDetails: data?.stylistDetails ?? [],
    dayHadAppointments: data?.dayHadAppointments ?? false,
    firstAppointmentTime: data?.firstAppointmentTime ?? null,
    isLoading,
  };
}
