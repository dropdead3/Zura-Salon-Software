/**
 * Phorest POS Adapter
 * 
 * Implements the POSAdapter interface for Phorest POS system.
 * This adapter wraps existing Phorest table queries and transforms
 * the data to the normalized POS format.
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  POSAdapter, 
  POSAppointment, 
  POSClient, 
  POSSalesSummary, 
  POSStaffMember,
  POSSyncResult,
  POSAppointmentStatus,
} from '@/types/pos';

// Map Phorest status to normalized status
function mapAppointmentStatus(phorestStatus: string | null): POSAppointmentStatus {
  const statusMap: Record<string, POSAppointmentStatus> = {
    'pending': 'pending',
    'confirmed': 'confirmed',
    'arrived': 'checked_in',
    'checked_in': 'checked_in',
    'in_progress': 'in_progress',
    'started': 'in_progress',
    'completed': 'completed',
    'finished': 'completed',
    'cancelled': 'cancelled',
    'no_show': 'no_show',
    'noshow': 'no_show',
  };
  
  return statusMap[phorestStatus?.toLowerCase() || ''] || 'pending';
}

// Calculate duration in minutes from time strings
function calculateDuration(startTime: string, endTime: string): number {
  try {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  } catch {
    return 60; // Default to 60 minutes if calculation fails
  }
}

export function createPhorestAdapter(organizationId: string): POSAdapter {
  return {
    type: 'phorest',

    async getAppointments({ dateFrom, dateTo, locationId, stylistUserId, status }) {
      let query = supabase
        .from('phorest_appointments')
        .select('*')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (stylistUserId) {
        query = query.eq('stylist_user_id', stylistUserId);
      }

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) throw error;

      const appointments: POSAppointment[] = (data || []).map((apt) => ({
        id: apt.id,
        externalId: apt.phorest_id || apt.id,
        clientName: apt.client_name || 'Unknown',
        clientPhone: apt.client_phone || undefined,
        clientEmail: undefined, // Not in phorest_appointments schema
        stylistUserId: apt.stylist_user_id || undefined,
        stylistName: undefined, // Not in phorest_appointments schema
        locationId: apt.location_id || undefined,
        date: apt.appointment_date,
        startTime: apt.start_time,
        endTime: apt.end_time,
        durationMinutes: calculateDuration(apt.start_time, apt.end_time),
        serviceName: apt.service_name || 'Service',
        serviceCategory: apt.service_category || undefined,
        status: mapAppointmentStatus(apt.status),
        totalPrice: apt.total_price || undefined,
        tipAmount: apt.tip_amount || undefined,
        notes: apt.notes || undefined,
        rebookedAtCheckout: apt.rebooked_at_checkout || false,
      }));

      // Filter by status if provided
      if (status && status.length > 0) {
        return appointments.filter((apt) => status.includes(apt.status));
      }

      return appointments;
    },

    async getClients({ search, preferredStylistId, limit = 100, offset = 0 }) {
      let query = supabase
        .from('phorest_clients')
        .select('*')
        .eq('is_duplicate', false)
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (preferredStylistId) {
        query = query.eq('preferred_stylist_id', preferredStylistId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((client): POSClient => ({
        id: client.id,
        externalId: client.phorest_client_id || client.id,
        firstName: undefined, // Stored as full name in schema
        lastName: undefined,
        name: client.name || 'Unknown',
        email: client.email || undefined,
        phone: client.phone || undefined,
        preferredStylistId: client.preferred_stylist_id || undefined,
        isNew: false, // Derived from first_visit
        firstVisitDate: client.first_visit || undefined,
        lastVisitDate: client.last_visit || undefined,
        totalVisits: client.visit_count || undefined,
        totalSpend: client.total_spend || undefined,
        notes: client.notes || undefined,
      }));
    },

    async getClientById(id: string) {
      const { data, error } = await supabase
        .from('phorest_clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        externalId: data.phorest_client_id || data.id,
        firstName: undefined,
        lastName: undefined,
        name: data.name || 'Unknown',
        email: data.email || undefined,
        phone: data.phone || undefined,
        preferredStylistId: data.preferred_stylist_id || undefined,
        isNew: false,
        firstVisitDate: data.first_visit || undefined,
        lastVisitDate: data.last_visit || undefined,
        totalVisits: data.visit_count || undefined,
        totalSpend: data.total_spend || undefined,
        notes: data.notes || undefined,
      };
    },

    async getSalesSummary({ dateFrom, dateTo, locationId }) {
      let query = supabase
        .from('phorest_daily_sales_summary')
        .select('*')
        .gte('summary_date', dateFrom)
        .lte('summary_date', dateTo);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.order('summary_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((summary): POSSalesSummary => ({
        date: summary.summary_date,
        locationId: summary.location_id || undefined,
        totalRevenue: Number(summary.total_revenue || 0),
        serviceRevenue: Number(summary.service_revenue || 0),
        productRevenue: Number(summary.product_revenue || 0),
        transactionCount: summary.total_transactions || 0,
        appointmentCount: summary.total_services || 0,
        averageTicket: summary.total_transactions 
          ? Number(summary.total_revenue || 0) / summary.total_transactions 
          : undefined,
        tipTotal: undefined, // Not in schema
      }));
    },

    async getStaffMembers({ locationId, isActive } = {}) {
      const query = supabase
        .from('phorest_staff_mapping')
        .select(`
          id,
          phorest_staff_id,
          user_id,
          employee_profiles!phorest_staff_mapping_user_id_fkey (
            user_id,
            full_name,
            display_name,
            email,
            location_id,
            is_active
          )
        `);

      const { data, error } = await query;

      if (error) throw error;

      type MappingWithProfile = {
        id: string;
        phorest_staff_id: string;
        user_id: string | null;
        employee_profiles: {
          user_id: string;
          full_name: string | null;
          display_name: string | null;
          email: string | null;
          location_id: string | null;
          is_active: boolean | null;
        } | null;
      };

      let staffMembers = ((data || []) as MappingWithProfile[])
        .filter((mapping) => mapping.employee_profiles)
        .map((mapping): POSStaffMember => {
          const profile = mapping.employee_profiles!;
          return {
            id: mapping.id,
            externalId: mapping.phorest_staff_id,
            userId: mapping.user_id || undefined,
            name: profile.display_name || profile.full_name || 'Unknown',
            email: profile.email || undefined,
            phone: undefined,
            isActive: profile.is_active !== false,
            locationIds: profile.location_id ? [profile.location_id] : undefined,
          };
        });

      // Filter by location if provided
      if (locationId) {
        staffMembers = staffMembers.filter(
          (staff) => staff.locationIds?.includes(locationId)
        );
      }

      // Filter by active status if provided
      if (isActive !== undefined) {
        staffMembers = staffMembers.filter((staff) => staff.isActive === isActive);
      }

      return staffMembers;
    },

    async syncData(syncType) {
      const { data, error } = await supabase.functions.invoke('sync-phorest-data', {
        body: { 
          sync_type: syncType,
          organization_id: organizationId,
        },
      });

      if (error) throw error;

      return {
        success: true,
        syncType,
        recordsProcessed: data?.processed || 0,
        recordsCreated: data?.created || 0,
        recordsUpdated: data?.updated || 0,
        errors: data?.errors || undefined,
        syncedAt: new Date().toISOString(),
      };
    },

    async checkHealth() {
      try {
        // Check if we can query the appointments table
        const { error } = await supabase
          .from('phorest_appointments')
          .select('id')
          .limit(1);

        if (error) {
          return { healthy: false, message: error.message };
        }

        // Check last sync status
        const { data: syncLog } = await supabase
          .from('phorest_sync_log')
          .select('status, completed_at')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (syncLog?.status === 'failed') {
          return { healthy: false, message: 'Last sync failed' };
        }

        return { healthy: true };
      } catch (err) {
        return { 
          healthy: false, 
          message: err instanceof Error ? err.message : 'Unknown error' 
        };
      }
    },
  };
}

// Default export for convenience
export const phorestAdapter = createPhorestAdapter('default');
