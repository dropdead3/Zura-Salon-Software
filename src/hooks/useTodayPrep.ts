import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';
import { calculateCLV, CLV_TIERS } from '@/lib/clv-calculator';
import { resolveStaffNamesByPhorestIds } from '@/utils/resolveStaffNames';

export interface PrepAppointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  serviceName: string | null;
  serviceCategory: string | null;
  status: string | null;
  totalPrice: number | null;
  notes: string | null;
  clientNotes: string | null;
  // Client info
  clientName: string | null;
  clientId: string | null;
  phorestClientId: string | null;
  isNewClient: boolean;
  // Client context (enriched)
  visitCount: number;
  totalSpend: number;
  lastVisit: string | null;
  firstVisit: string | null;
  isVip: boolean;
  birthday: string | null;
  clvTier: string | null;
  clvAnnualValue: number;
  // Recent services (last 3 visits)
  recentServices: { date: string; name: string; staffName: string | null }[];
  // Recent products purchased
  recentProducts: { date: string; name: string; quantity: number }[];
  // Client notes from client_notes table
  clientDirectoryNotes: { note: string; authorName: string; createdAt: string; isPrivate: boolean }[];
  // Previous appointment notes
  previousAppointmentNotes: { note: string; authorName: string; createdAt: string }[];
}

export function useTodayPrep() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-prep', user?.id, effectiveOrganization, today],
    queryFn: async () => {
      if (!user?.id || !effectiveOrganization) return [];

      // 1. Get today's appointments for this stylist (both tables)
      const [{ data: nativeAppts }, { data: phorestAppts }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, appointment_date, start_time, end_time, service_name, service_category, status, total_price, notes, client_notes, client_name, client_id, phorest_client_id, is_new_client')
          .eq('staff_user_id', user.id)
          .eq('appointment_date', today)
          .not('status', 'in', '("cancelled","no_show")')
          .is('deleted_at', null)
          .order('start_time'),
        supabase
          .from('v_all_appointments' as any)
          .select('id, appointment_date, start_time, end_time, service_name, service_category, status, total_price, notes, client_notes, client_name, phorest_client_id, is_new_client')
          .eq('stylist_user_id', user.id)
          .eq('appointment_date', today)
          .not('status', 'in', '("cancelled","no_show")')
          .is('deleted_at', null)
          .eq('is_demo', false)
          .order('start_time'),
      ]);

      // Merge into a unified list
      const allAppts = [
        ...(nativeAppts || []).map((a: any) => ({
          id: a.id,
          appointmentDate: a.appointment_date,
          startTime: a.start_time,
          endTime: a.end_time,
          serviceName: a.service_name,
          serviceCategory: a.service_category,
          status: a.status,
          totalPrice: a.total_price,
          notes: a.notes,
          clientNotes: a.client_notes,
          clientName: a.client_name,
          clientId: a.client_id,
          phorestClientId: a.phorest_client_id,
          isNewClient: a.is_new_client ?? false,
          source: 'native' as const,
        })),
        ...(phorestAppts || []).map((a: any) => ({
          id: a.id,
          appointmentDate: a.appointment_date,
          startTime: a.start_time,
          endTime: a.end_time,
          serviceName: a.service_name,
          serviceCategory: a.service_category,
          status: a.status,
          totalPrice: a.total_price,
          notes: a.notes,
          clientNotes: a.client_notes,
          clientName: a.client_name,
          clientId: null,
          phorestClientId: a.phorest_client_id,
          isNewClient: a.is_new_client ?? false,
          source: 'phorest' as const,
        })),
      ].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      // Filter out blocks/breaks
      const clientAppts = allAppts.filter(a => 
        a.serviceCategory !== 'Block' && a.serviceCategory !== 'Break' && a.clientName
      );

      if (clientAppts.length === 0) return [];

      // 2. Fetch client details from phorest_clients
      const phorestClientIds = [...new Set(clientAppts.map(a => a.phorestClientId).filter(Boolean))];
      
      const clientMap = new Map<string, any>();
      if (phorestClientIds.length > 0) {
        const { data: clients } = await supabase
          .from('v_all_clients' as any)
          .select('phorest_client_id, name, visit_count, total_spend, last_visit, first_visit, is_vip, birthday, client_since')
          .in('phorest_client_id', phorestClientIds);
        
        for (const c of clients || []) {
          clientMap.set(c.phorest_client_id, c);
        }
      }

      // 3. Fetch recent transaction items for these clients (services + products)
      const txnMap = new Map<string, { services: any[]; products: any[] }>();
      if (phorestClientIds.length > 0) {
        const { data: txnItems } = await supabase
          .from('v_all_transaction_items' as any)
          .select('phorest_client_id, transaction_date, item_name, item_type, quantity, staff_user_id')
          .in('phorest_client_id', phorestClientIds)
          .order('transaction_date', { ascending: false })
          .limit(200);
        
        // Get staff names for recent services
        const staffIds = [...new Set((txnItems || []).map(t => t.staff_user_id).filter(Boolean))];
        const staffNameMap = await resolveStaffNamesByPhorestIds(staffIds as string[]);

        for (const item of txnItems || []) {
          if (!item.phorest_client_id) continue;
          if (!txnMap.has(item.phorest_client_id)) {
            txnMap.set(item.phorest_client_id, { services: [], products: [] });
          }
          const bucket = txnMap.get(item.phorest_client_id)!;
          if (item.item_type === 'product') {
            if (bucket.products.length < 5) {
              bucket.products.push({
                date: item.transaction_date,
                name: item.item_name,
                quantity: item.quantity || 1,
              });
            }
          } else {
            if (bucket.services.length < 6) {
              bucket.services.push({
                date: item.transaction_date,
                name: item.item_name,
                staffName: item.staff_user_id ? staffNameMap[item.staff_user_id] || null : null,
              });
            }
          }
        }
      }

      // 4. Fetch client notes (from client_notes table via phorest_clients.id)
      const clientNoteMap = new Map<string, any[]>();
      if (phorestClientIds.length > 0) {
        // First get internal IDs
        const { data: clientIdRows } = await supabase
          .from('v_all_clients' as any)
          .select('id, phorest_client_id')
          .in('phorest_client_id', phorestClientIds);
        
        const internalIds = (clientIdRows || []).map(c => c.id);
        const internalToPhorest = new Map((clientIdRows || []).map(c => [c.id, c.phorest_client_id]));
        
        if (internalIds.length > 0) {
          const { data: notes } = await supabase
            .from('client_notes')
            .select(`
              id, client_id, note, is_private, created_at,
              employee_profiles!client_notes_user_id_fkey(display_name, full_name)
            `)
            .in('client_id', internalIds)
            .order('created_at', { ascending: false })
            .limit(50);
          
          for (const n of notes || []) {
            const pId = internalToPhorest.get(n.client_id);
            if (!pId) continue;
            if (!clientNoteMap.has(pId)) clientNoteMap.set(pId, []);
            const arr = clientNoteMap.get(pId)!;
            if (arr.length < 3) {
              const profile = (n as any).employee_profiles;
              arr.push({
                note: n.note,
                authorName: profile?.display_name || profile?.full_name || 'Staff',
                createdAt: n.created_at,
                isPrivate: n.is_private,
              });
            }
          }
        }
      }

      // 5. Fetch previous appointment notes
      const apptNoteMap = new Map<string, any[]>();
      if (phorestClientIds.length > 0) {
        // Get recent past appointments for these clients
        const { data: pastAppts } = await supabase
          .from('v_all_appointments' as any)
          .select('id, phorest_client_id')
          .in('phorest_client_id', phorestClientIds)
          .lt('appointment_date', today)
          .eq('is_demo', false)
          .order('appointment_date', { ascending: false })
          .limit(100);
        
        const pastApptIds = (pastAppts || []).map(a => a.id);
        const apptToClient = new Map((pastAppts || []).map(a => [a.id, a.phorest_client_id]));
        
        if (pastApptIds.length > 0) {
          const { data: apptNotes } = await supabase
            .from('appointment_notes')
            .select(`
              id, phorest_appointment_id, note, created_at,
              author:employee_profiles!appointment_notes_author_id_fkey(display_name, full_name)
            `)
            .in('phorest_appointment_id', pastApptIds)
            .order('created_at', { ascending: false })
            .limit(50);
          
          for (const n of apptNotes || []) {
            const pId = apptToClient.get(n.phorest_appointment_id);
            if (!pId) continue;
            if (!apptNoteMap.has(pId)) apptNoteMap.set(pId, []);
            const arr = apptNoteMap.get(pId)!;
            if (arr.length < 3) {
              const author = (n as any).author;
              arr.push({
                note: n.note,
                authorName: author?.display_name || author?.full_name || 'Staff',
                createdAt: n.created_at,
              });
            }
          }
        }
      }

      // 6. Assemble enriched appointments
      const result: PrepAppointment[] = clientAppts.map(appt => {
        const client = appt.phorestClientId ? clientMap.get(appt.phorestClientId) : null;
        const visitCount = client?.visit_count ?? 0;
        const totalSpend = Number(client?.total_spend ?? 0);
        const firstVisit = client?.first_visit || client?.client_since || null;
        const lastVisit = client?.last_visit || null;
        
        const clv = calculateCLV(totalSpend, visitCount, firstVisit, lastVisit);
        // Simple tier assignment based on annual value thresholds
        const getTier = (annualValue: number) => {
          if (annualValue >= 2000) return CLV_TIERS.platinum;
          if (annualValue >= 1000) return CLV_TIERS.gold;
          if (annualValue >= 500) return CLV_TIERS.silver;
          return CLV_TIERS.bronze;
        };
        const tier = clv.isReliable ? getTier(clv.annualValue) : null;
        
        const txns = appt.phorestClientId ? txnMap.get(appt.phorestClientId) : null;

        return {
          id: appt.id,
          appointmentDate: appt.appointmentDate,
          startTime: appt.startTime,
          endTime: appt.endTime,
          serviceName: appt.serviceName,
          serviceCategory: appt.serviceCategory,
          status: appt.status,
          totalPrice: appt.totalPrice,
          notes: appt.notes,
          clientNotes: appt.clientNotes,
          clientName: appt.clientName,
          clientId: appt.clientId,
          phorestClientId: appt.phorestClientId,
          isNewClient: appt.isNewClient || visitCount === 0,
          visitCount,
          totalSpend,
          lastVisit,
          firstVisit,
          isVip: client?.is_vip ?? false,
          birthday: client?.birthday || null,
          clvTier: tier?.label || null,
          clvAnnualValue: clv.isReliable ? clv.annualValue : 0,
          recentServices: txns?.services || [],
          recentProducts: txns?.products || [],
          clientDirectoryNotes: appt.phorestClientId ? clientNoteMap.get(appt.phorestClientId) || [] : [],
          previousAppointmentNotes: appt.phorestClientId ? apptNoteMap.get(appt.phorestClientId) || [] : [],
        };
      });

      return result;
    },
    enabled: !!user?.id && !!effectiveOrganization,
    staleTime: 2 * 60 * 1000,
  });
}
