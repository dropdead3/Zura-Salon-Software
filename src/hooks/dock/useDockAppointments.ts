/**
 * useDockAppointments — Fetches today's appointments for a specific staff member.
 * Lightweight query for the Dock Schedule tab.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DEMO_APPOINTMENTS } from './dockDemoData';
import { formatFirstLastInitial } from '@/lib/dock-utils';

export interface DockAppointment {
  id: string;
  source: 'phorest' | 'local';
  client_name: string | null;
  stylist_name: string | null;
  stylist_user_id?: string | null;
  assistant_names?: string[];
  service_name: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  payment_status?: string | null;
  payment_failure_reason?: string | null;
  location_id: string | null;
  phorest_client_id?: string | null;
  client_id?: string | null;
  notes?: string | null;
  mix_bowl_count?: number;
  total_price?: number | null;
  has_card_on_file?: boolean;
  card_last4?: string | null;
  card_brand?: string | null;
  card_exp_month?: number | null;
  card_exp_year?: number | null;
}

export function useDockAppointments(staffUserId: string | null, locationId?: string, staffFilter?: string) {
  const { isDemoMode, usesRealData, organizationId } = useDockDemo();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dock-appointments', staffUserId, today, isDemoMode, usesRealData, organizationId, locationId, staffFilter],
    queryFn: async (): Promise<DockAppointment[]> => {
      // Generic preview — pure faux data, merge any demo service overrides
      if (isDemoMode && !usesRealData) {
        return DEMO_APPOINTMENTS.map(a => {
          try {
            const override = sessionStorage.getItem(`dock-demo-services::${a.id}`);
            if (override) return { ...a, service_name: override };
          } catch {}
          return a;
        });
      }

      // Org-specific demo — fetch real appointments for the selected location
      if (isDemoMode && usesRealData && organizationId) {
        // If no location selected yet, wait for auto-select
        if (!locationId) return DEMO_APPOINTMENTS;

        // Fetch registered team member IDs for this location
        const { data: teamProfiles } = await supabase
          .from('employee_profiles')
          .select('user_id, location_id, location_ids')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .eq('is_approved', true);
        const teamUserIds = (teamProfiles || [])
          .filter(p => p.location_id === locationId || (p.location_ids && (p.location_ids as string[]).includes(locationId)))
          .map(p => p.user_id);

        // Fetch today's phorest appointments for this specific location
        let query = supabase
          .from('v_all_appointments')
          .select('id, client_name, service_name, appointment_date, start_time, end_time, status, payment_status, payment_failure_reason, location_id, phorest_client_id, notes, stylist_user_id, total_price')
          .eq('location_id', locationId)
          .eq('appointment_date', today)
          .is('deleted_at', null)
          .order('start_time', { ascending: true })
          .limit(50);

        // Apply staff filter
        if (staffFilter && staffFilter !== 'all') {
          query = query.eq('stylist_user_id', staffFilter);
        } else {
          // "All Team" — only show appointments for registered team members
          if (teamUserIds.length === 0) return DEMO_APPOINTMENTS;
          query = query.in('stylist_user_id', teamUserIds);
        }

        const { data: phorestData, error: phorestErr } = await query;
        if (phorestErr) throw phorestErr;

        // Resolve stylist names from employee_profiles
        const stylistIds = [...new Set((phorestData || []).map(a => a.stylist_user_id).filter(Boolean))];
        let stylistMap: Record<string, string> = {};
        if (stylistIds.length > 0) {
          const { data: profiles } = await supabase
            .from('employee_profiles')
            .select('user_id, display_name, full_name')
            .in('user_id', stylistIds);
          for (const p of (profiles || [])) {
            stylistMap[p.user_id] = formatFirstLastInitial(p.display_name || p.full_name || '');
          }
        }

        // Resolve assistant names from appointment_assistants
        const apptIds = (phorestData || []).map(a => a.id);
        let assistantMap: Record<string, string[]> = {};
        if (apptIds.length > 0) {
          const { data: assistantData } = await supabase
            .from('appointment_assistants')
            .select('appointment_id, assistant_user_id')
            .in('appointment_id', apptIds);
          if (assistantData && assistantData.length > 0) {
            const assistantUserIds = [...new Set(assistantData.map(a => a.assistant_user_id))];
            const { data: assistantProfiles } = await supabase
              .from('employee_profiles')
              .select('user_id, display_name, full_name')
              .in('user_id', assistantUserIds);
            const nameMap: Record<string, string> = {};
            for (const p of (assistantProfiles || [])) {
              nameMap[p.user_id] = formatFirstLastInitial(p.display_name || p.full_name || '');
            }
            for (const a of assistantData) {
              const name = nameMap[a.assistant_user_id];
              if (name) {
                if (!assistantMap[a.appointment_id]) assistantMap[a.appointment_id] = [];
                assistantMap[a.appointment_id].push(name);
              }
            }
          }
        }

        const appointments: DockAppointment[] = (phorestData || []).map((a) => ({
          id: a.id,
          source: 'phorest' as const,
          client_name: a.client_name,
          stylist_name: a.stylist_user_id ? (stylistMap[a.stylist_user_id] || null) : null,
          stylist_user_id: a.stylist_user_id || null,
          assistant_names: assistantMap[a.id] || [],
          service_name: a.service_name,
          appointment_date: a.appointment_date,
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status,
          payment_status: (a as any).payment_status || 'pending',
          payment_failure_reason: (a as any).payment_failure_reason || null,
          location_id: a.location_id,
          phorest_client_id: a.phorest_client_id,
          notes: a.notes,
          mix_bowl_count: 0,
          total_price: (a as any).total_price ?? null,
        }));

        // Fetch bowl counts for these appointments via mix_sessions + mix_bowls
        const demoApptIds = appointments.map(a => a.id);
        if (demoApptIds.length > 0) {
          const { data: sessionsData } = await supabase
            .from('mix_sessions')
            .select('id, appointment_id')
            .in('appointment_id', demoApptIds);
          if (sessionsData && sessionsData.length > 0) {
            const sessionIds = sessionsData.map(s => s.id);
            const sessionToAppt: Record<string, string> = {};
            for (const s of sessionsData) sessionToAppt[s.id] = s.appointment_id;
            const { data: bowlsData } = await supabase
              .from('mix_bowl_projections')
              .select('mix_bowl_id, mix_session_id')
              .in('mix_session_id', sessionIds)
              .gt('line_item_count', 0);
            const bowlCounts: Record<string, number> = {};
            for (const b of (bowlsData || [])) {
              const apptId = sessionToAppt[b.mix_session_id];
              if (apptId) bowlCounts[apptId] = (bowlCounts[apptId] || 0) + 1;
            }
            for (const a of appointments) {
              a.mix_bowl_count = bowlCounts[a.id] || 0;
            }
          }
        }

        // Also include appointments where the filtered staff is an assistant
        if (staffFilter && staffFilter !== 'all') {
          const { data: assistedAppts } = await supabase
            .from('appointment_assistants')
            .select('appointment_id')
            .eq('assistant_user_id', staffFilter);
          if (assistedAppts && assistedAppts.length > 0) {
            const assistedIds = assistedAppts.map(a => a.appointment_id);
            const existingIds = new Set(appointments.map(a => a.id));
            const missingIds = assistedIds.filter(id => !existingIds.has(id));
            if (missingIds.length > 0) {
              const { data: extraAppts } = await supabase
                .from('v_all_appointments')
                .select('id, client_name, service_name, appointment_date, start_time, end_time, status, payment_status, payment_failure_reason, location_id, phorest_client_id, notes, stylist_user_id, total_price')
                .in('id', missingIds)
                .eq('location_id', locationId)
                .eq('appointment_date', today)
                .is('deleted_at', null)
                .order('start_time', { ascending: true });
              for (const a of (extraAppts || [])) {
                appointments.push({
                  id: a.id,
                  source: 'phorest' as const,
                  client_name: a.client_name,
                  stylist_name: a.stylist_user_id ? (stylistMap[a.stylist_user_id] || null) : null,
                  stylist_user_id: a.stylist_user_id || null,
                  assistant_names: assistantMap[a.id] || [],
                  service_name: a.service_name,
                  appointment_date: a.appointment_date,
                  start_time: a.start_time,
                  end_time: a.end_time,
                  status: a.status,
                   payment_status: (a as any).payment_status || 'pending',
                   payment_failure_reason: (a as any).payment_failure_reason || null,
                   location_id: a.location_id,
                  phorest_client_id: a.phorest_client_id,
                  notes: a.notes,
                  mix_bowl_count: 0,
                  total_price: (a as any).total_price ?? null,
                });
              }
              appointments.sort((a, b) => a.start_time.localeCompare(b.start_time));
            }
          }
        }

        // Batch-check card on file for failed payment appointments
        const failedAppts = appointments.filter(a => a.payment_status === 'failed' && a.phorest_client_id);
        if (failedAppts.length > 0) {
          const clientIds = [...new Set(failedAppts.map(a => a.phorest_client_id!))];
          const { data: cards } = await supabase
            .from('client_cards_on_file')
            .select('client_id, card_last4, card_brand, card_exp_month, card_exp_year')
            .in('client_id', clientIds)
            .eq('is_default', true);
          const cardMap = new Map((cards || []).map(c => [c.client_id, { last4: c.card_last4, brand: c.card_brand, exp_month: c.card_exp_month, exp_year: c.card_exp_year }]));
          for (const a of appointments) {
            if (a.payment_status === 'failed' && a.phorest_client_id) {
              const card = cardMap.get(a.phorest_client_id);
              a.has_card_on_file = !!card;
              a.card_last4 = card?.last4 || null;
              a.card_brand = card?.brand || null;
              a.card_exp_month = card?.exp_month ?? null;
              a.card_exp_year = card?.exp_year ?? null;
            }
          }
        }

        return appointments.length > 0 ? appointments : DEMO_APPOINTMENTS;
      }

      // Normal (non-demo) mode — fetch by staff user
      const [phorestResult, localResult] = await Promise.all([
        supabase
          .from('v_all_appointments')
          .select('id, client_name, service_name, appointment_date, start_time, end_time, status, payment_status, payment_failure_reason, location_id, phorest_client_id, notes, stylist_user_id, total_price')
          .eq('stylist_user_id', staffUserId!)
          .eq('appointment_date', today)
          .is('deleted_at', null)
          .order('start_time', { ascending: true }),
        supabase
          .from('appointments')
          .select('id, client_name, service_name, appointment_date, start_time, end_time, status, payment_status, payment_failure_reason, location_id, client_id, notes, total_price')
          .eq('staff_user_id', staffUserId!)
          .eq('appointment_date', today)
          .is('deleted_at', null)
          .not('service_category', 'in', '("Block","Break")')
          .order('start_time', { ascending: true }),
      ]);

      if (phorestResult.error) throw phorestResult.error;
      if (localResult.error) throw localResult.error;

      const phorest: DockAppointment[] = (phorestResult.data || []).map((a) => ({
        id: a.id,
        source: 'phorest' as const,
        client_name: a.client_name,
        stylist_name: null,
        stylist_user_id: a.stylist_user_id || null,
        service_name: a.service_name,
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        payment_status: (a as any).payment_status || 'pending',
        payment_failure_reason: (a as any).payment_failure_reason || null,
        location_id: a.location_id,
        phorest_client_id: a.phorest_client_id,
        notes: a.notes,
        total_price: (a as any).total_price ?? null,
      }));

      const local: DockAppointment[] = (localResult.data || []).map((a) => ({
        id: a.id,
        source: 'local' as const,
        client_name: a.client_name,
        stylist_name: null,
        service_name: a.service_name,
        appointment_date: a.appointment_date!,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        payment_status: (a as any).payment_status || 'pending',
        payment_failure_reason: (a as any).payment_failure_reason || null,
        location_id: a.location_id,
        client_id: a.client_id,
        notes: a.notes,
        total_price: (a as any).total_price ?? null,
      }));

      // Fetch bowl counts for appointments
      const all = [...phorest, ...local];
      const allIds = all.map((a) => a.id);
      if (allIds.length > 0) {
        const { data: sessions } = await supabase
          .from('mix_sessions')
          .select('id, appointment_id')
          .in('appointment_id', allIds);
        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);
          const sessionToAppt: Record<string, string> = {};
          for (const s of sessions) sessionToAppt[s.id] = s.appointment_id;
          const { data: bowlsData } = await supabase
            .from('mix_bowl_projections')
            .select('mix_bowl_id, mix_session_id')
            .in('mix_session_id', sessionIds)
            .gt('line_item_count', 0);
          const bowlCounts: Record<string, number> = {};
          for (const b of (bowlsData || [])) {
            const apptId = sessionToAppt[b.mix_session_id];
            if (apptId) bowlCounts[apptId] = (bowlCounts[apptId] || 0) + 1;
          }
          for (const a of all) {
            (a as any).mix_bowl_count = bowlCounts[a.id] || 0;
          }
        }
      }

      // Batch-check card on file for failed payment appointments
      const failedNormal = all.filter(a => a.payment_status === 'failed');
      if (failedNormal.length > 0) {
        const clientIds = [...new Set(failedNormal.map(a => a.phorest_client_id || a.client_id).filter(Boolean))] as string[];
        if (clientIds.length > 0) {
          const { data: cards } = await supabase
            .from('client_cards_on_file')
            .select('client_id, card_last4, card_brand, card_exp_month, card_exp_year')
            .in('client_id', clientIds)
            .eq('is_default', true);
          const cardMap = new Map((cards || []).map(c => [c.client_id, { last4: c.card_last4, brand: c.card_brand, exp_month: c.card_exp_month, exp_year: c.card_exp_year }]));
          for (const a of all) {
            if (a.payment_status === 'failed') {
              const cid = a.phorest_client_id || a.client_id;
              const card = cid ? cardMap.get(cid) : undefined;
              a.has_card_on_file = !!card;
              a.card_last4 = card?.last4 || null;
              a.card_brand = card?.brand || null;
              a.card_exp_month = card?.exp_month ?? null;
              a.card_exp_year = card?.exp_year ?? null;
            }
          }
        }
      }

      return all.map((a) => ({ ...a, mix_bowl_count: (a as any).mix_bowl_count ?? 0 }));
    },
    enabled: !!staffUserId || (isDemoMode && usesRealData),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
