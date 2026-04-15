import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type KioskState = 'idle' | 'lookup' | 'confirm' | 'browse' | 'wrong_location' | 'signing' | 'success' | 'walk_in' | 'booking' | 'error';

export interface KioskAppointment {
  id: string;
  phorest_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_name: string | null;
  status: string | null;
  stylist_user_id: string | null;
  stylist_name?: string;
  stylist_photo?: string;
  stylist_phone?: string;
  stylist_email?: string;
  client_name?: string;
  client_id?: string;
  phorest_client_id?: string;
  location_id?: string;
  location_name?: string;
  is_wrong_location?: boolean;
}

export interface KioskClient {
  id: string;
  phorest_client_id?: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface KioskSession {
  sessionId: string;
  startedAt: Date;
  locationId: string;
  organizationId: string;
  lookupMethod?: 'phone' | 'name' | 'qr' | 'code' | 'browse';
  client?: KioskClient;
  appointments?: KioskAppointment[];
  wrongLocationAppointments?: KioskAppointment[];
  selectedAppointment?: KioskAppointment;
  isWalkIn?: boolean;
}

export function useKioskCheckin(locationId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<KioskState>('idle');
  const [session, setSession] = useState<KioskSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start a new kiosk session
  const startSession = useCallback(() => {
    const newSession: KioskSession = {
      sessionId: crypto.randomUUID(),
      startedAt: new Date(),
      locationId,
      organizationId,
    };
    setSession(newSession);
    setState('lookup');
    setError(null);
  }, [locationId, organizationId]);

  // Reset to idle
  const resetToIdle = useCallback(() => {
    if (session) {
      // Log abandoned session
      supabase.from('kiosk_analytics').insert({
        organization_id: organizationId,
        location_id: locationId,
        session_id: session.sessionId,
        session_started_at: session.startedAt.toISOString(),
        session_ended_at: new Date().toISOString(),
        session_completed: false,
        abandoned_at_step: state,
      }).then(() => {});
    }
    setSession(null);
    setState('idle');
    setError(null);
  }, [session, state, organizationId, locationId]);

  // Lookup client by phone
  const lookupByPhone = useMutation({
    mutationFn: async (phone: string) => {
      // Normalize phone - remove non-digits
      const normalizedPhone = phone.replace(/\D/g, '');
      const phonePattern = `%${normalizedPhone.slice(-10)}%`;

      // Search in phorest_clients
      const { data: clients, error } = await supabase
        .from('phorest_clients')
        .select('id, phorest_client_id, name, email, phone')
        .eq('is_duplicate', false)
        .ilike('phone', phonePattern)
        .limit(10);

      if (error) throw error;
      
      if (!clients || clients.length === 0) {
        return { clients: [], appointments: [] };
      }

      // Get today's appointments for these clients
      const today = new Date().toISOString().split('T')[0];
      const clientIds = clients.map(c => c.phorest_client_id).filter(Boolean);

      const { data: appointments } = await supabase
        .from('v_all_appointments')
        .select('id, appointment_date, start_time, end_time, service_name, status, stylist_user_id, phorest_client_id, client_name, location_id, staff_name')
        .in('phorest_client_id', clientIds)
        .eq('appointment_date', today)
        .in('status', ['booked', 'confirmed', 'pending'])
        .order('start_time');

      // Fetch location names for appointments at different locations
      const appointmentLocationIds = [...new Set((appointments || [])
        .map(a => a.location_id)
        .filter(Boolean)
      )];
      
      let locationMap: Record<string, string> = {};
      if (appointmentLocationIds.length > 0) {
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', appointmentLocationIds);
        
        if (locations) {
          locationMap = Object.fromEntries(locations.map(l => [l.id, l.name]));
        }
      }

      return {
        clients: clients.map(c => ({
          id: c.id,
          phorest_client_id: c.phorest_client_id || undefined,
          name: c.name || '',
          phone: c.phone || undefined,
          email: c.email || undefined,
        })),
        appointments: (appointments || []).map(a => ({
          id: a.id,
          phorest_id: undefined,
          appointment_date: a.appointment_date,
          start_time: a.start_time,
          end_time: a.end_time,
          service_name: a.service_name,
          status: a.status,
          stylist_user_id: a.stylist_user_id,
          stylist_name: a.staff_name || undefined,
          stylist_photo: undefined,
          stylist_phone: undefined,
          stylist_email: undefined,
          phorest_client_id: a.phorest_client_id || undefined,
          client_name: a.client_name || undefined,
          location_id: a.location_id || undefined,
          location_name: a.location_id ? locationMap[a.location_id] : undefined,
          is_wrong_location: a.location_id ? a.location_id !== locationId : false,
        })),
        kioskLocationId: locationId,
      };
    },
    onSuccess: (data) => {
      if (data.appointments.length > 0) {
        // Separate appointments by location
        const correctLocationAppts = data.appointments.filter(a => !a.is_wrong_location);
        const wrongLocationAppts = data.appointments.filter(a => a.is_wrong_location);
        
        const client = data.clients.find(c => 
          data.appointments.some(a => a.phorest_client_id === c.phorest_client_id)
        );
        
        if (correctLocationAppts.length > 0) {
          // Has appointments at this location - normal flow
          setSession(prev => prev ? {
            ...prev,
            lookupMethod: 'phone',
            client: client,
            appointments: correctLocationAppts,
            wrongLocationAppointments: wrongLocationAppts,
          } : null);
          setState('confirm');
        } else if (wrongLocationAppts.length > 0) {
          // Only has appointments at OTHER locations - show wrong location screen
          setSession(prev => prev ? {
            ...prev,
            lookupMethod: 'phone',
            client: client,
            appointments: [],
            wrongLocationAppointments: wrongLocationAppts,
          } : null);
          setState('wrong_location');
        }
      } else if (data.clients.length > 0) {
        // Found client but no appointments - offer walk-in
        setSession(prev => prev ? {
          ...prev,
          lookupMethod: 'phone',
          client: data.clients[0],
          appointments: [],
        } : null);
        setState('confirm'); // Will show "no appointments" message with walk-in option
      } else {
        // No match - offer walk-in
        setState('confirm');
      }
    },
    onError: (err) => {
      console.error('Lookup failed:', err);
      setError('Unable to find your appointment. Please see the front desk for assistance.');
      setState('error');
    },
  });

  // Select appointment and proceed
  const selectAppointment = useCallback((appointment: KioskAppointment) => {
    setSession(prev => prev ? {
      ...prev,
      selectedAppointment: appointment,
    } : null);
    // TODO: Check if forms are required, then go to signing or success
    setState('success'); // For now, skip signing
  }, []);

  // Complete check-in
  const completeCheckin = useMutation({
    mutationFn: async () => {
      if (!session?.selectedAppointment) {
        throw new Error('No appointment selected');
      }

      const appointment = session.selectedAppointment;

      // 1. Update appointment status — try both tables since we don't know source
      const { error: updateError } = await supabase
        .from('phorest_appointments')
        .update({ status: 'checked_in' })
        .eq('id', appointment.id);
      // Also try the zura appointments table
      await supabase
        .from('appointments')
        .update({ status: 'checked_in' })
        .eq('id', appointment.id);

      if (updateError) throw updateError;

      // 2. Create check-in record
      const { error: checkinError } = await supabase
        .from('appointment_check_ins')
        .insert({
          appointment_id: null,
          phorest_appointment_id: appointment.phorest_id,
          client_id: session.client?.id ? session.client.id : null,
          phorest_client_id: appointment.phorest_client_id,
          organization_id: organizationId,
          location_id: locationId,
          check_in_method: 'kiosk',
          kiosk_session_id: session.sessionId,
          stylist_user_id: appointment.stylist_user_id,
        });

      if (checkinError) throw checkinError;

      // 3. Send push notification to stylist
      if (appointment.stylist_user_id) {
        await supabase.functions.invoke('notify-stylist-checkin', {
          body: {
            appointment_id: appointment.id,
            stylist_user_id: appointment.stylist_user_id,
            client_name: session.client?.name || appointment.client_name || 'Client',
            service_name: appointment.service_name || 'Appointment',
            scheduled_time: appointment.start_time,
            location_id: locationId,
          },
        });
      }

      // 4. Log analytics
      await supabase.from('kiosk_analytics').insert({
        organization_id: organizationId,
        location_id: locationId,
        session_id: session.sessionId,
        session_started_at: session.startedAt.toISOString(),
        session_ended_at: new Date().toISOString(),
        session_completed: true,
        client_id: session.client?.phorest_client_id,
        appointment_id: appointment.id,
        check_in_method: session.lookupMethod,
        is_walk_in: false,
        total_duration_seconds: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
    },
    onError: (err) => {
      console.error('Check-in failed:', err);
      setError('Check-in failed. Please see the front desk for assistance.');
      setState('error');
    },
  });

  // Start walk-in flow
  const startWalkIn = useCallback(() => {
    setSession(prev => prev ? {
      ...prev,
      isWalkIn: true,
    } : null);
    setState('walk_in');
  }, []);

  // Start booking wizard flow
  const startBooking = useCallback(() => {
    setSession(prev => prev ? {
      ...prev,
      isWalkIn: true,
    } : null);
    setState('booking');
  }, []);

  // Fetch upcoming appointments for browse mode
  const fetchUpcomingAppointments = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Calculate time window: -30min to +60min from now
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const windowStart = Math.max(0, currentMinutes - 30);
      const windowEnd = currentMinutes + 60;
      
      const startTimeStr = `${Math.floor(windowStart/60).toString().padStart(2,'0')}:${(windowStart%60).toString().padStart(2,'0')}:00`;
      const endTimeStr = `${Math.floor(windowEnd/60).toString().padStart(2,'0')}:${(windowEnd%60).toString().padStart(2,'0')}:00`;

      const { data: appointments, error } = await supabase
        .from('v_all_appointments')
        .select('id, appointment_date, start_time, end_time, service_name, status, stylist_user_id, client_name, location_id, staff_name')
        .eq('appointment_date', today)
        .eq('location_id', locationId)
        .gte('start_time', startTimeStr)
        .lte('start_time', endTimeStr)
        .in('status', ['booked', 'confirmed', 'pending'])
        .order('start_time');

      if (error) throw error;
      return appointments || [];
    },
    onSuccess: (appointments) => {
      setSession(prev => prev ? {
        ...prev,
        lookupMethod: 'browse',
        appointments: appointments.map(a => ({
          id: a.id,
          phorest_id: undefined,
          appointment_date: a.appointment_date,
          start_time: a.start_time,
          end_time: a.end_time,
          service_name: a.service_name,
          status: a.status,
          stylist_user_id: a.stylist_user_id,
          stylist_name: a.staff_name || undefined,
          stylist_photo: undefined,
          client_name: a.client_name || undefined,
          location_id: a.location_id || undefined,
        })),
      } : null);
      setState('browse');
    },
    onError: (err) => {
      console.error('Failed to fetch appointments:', err);
      setError('Unable to load appointments. Please see the front desk for assistance.');
      setState('error');
    },
  });

  // Start browse flow
  const startBrowse = useCallback(() => {
    fetchUpcomingAppointments.mutate();
  }, [fetchUpcomingAppointments]);

  return {
    state,
    session,
    error,
    startSession,
    resetToIdle,
    lookupByPhone: lookupByPhone.mutate,
    isLookingUp: lookupByPhone.isPending,
    selectAppointment,
    completeCheckin: completeCheckin.mutate,
    isCheckingIn: completeCheckin.isPending,
    startWalkIn,
    startBooking,
    startBrowse,
    isBrowsing: fetchUpcomingAppointments.isPending,
  };
}
