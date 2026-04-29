// ============================================================
// AI Capability Handlers
// ----------------------------------------------------------------
// Registers read / propose / execute handlers for every pilot
// capability. Importing this file has the side effect of
// populating the registry — both edge functions import it once.
// ============================================================

// deno-lint-ignore-file no-explicit-any

import {
  registerCapability,
  assertOwnership,
  isManagerRole,
  type ProposeContext,
  type ExecuteContext,
  type ProposeResult,
  type ExecuteResult,
  type ReadResult,
  renderPreview,
} from './capability-runtime.ts';

// ----------------------------------------------------------------
// helpers
// ----------------------------------------------------------------
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function parseDateString(dateStr: string): string {
  const today = new Date();
  const lower = (dateStr || '').toLowerCase().trim();
  if (lower === 'today') return today.toISOString().split('T')[0];
  if (lower === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }
  if (lower.startsWith('next ')) {
    const dayName = lower.replace('next ', '');
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName);
    if (targetDay !== -1) {
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      today.setDate(today.getDate() + daysUntil);
      return today.toISOString().split('T')[0];
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return today.toISOString().split('T')[0];
}

function parseTimeString(timeStr: string): string {
  const match = (timeStr || '').match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3]?.toLowerCase();
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// ============================================================
// team.find_member  (read)
// ============================================================
registerCapability('team.find_member', {
  read: async ({ supabase, organizationId, params }: ProposeContext): Promise<ReadResult> => {
    const query = String(params.query || '').trim();
    if (!query) return { data: { matches: [], message: 'Provide a name to search.' } };

    const { data: profiles, error } = await supabase
      .from('employee_profiles')
      .select('user_id, full_name, display_name, hire_date, is_active, is_super_admin')
      .eq('organization_id', organizationId)
      .or(`full_name.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(8);

    if (error) throw error;
    if (!profiles?.length) {
      return { data: { matches: [], message: `No team member found matching "${query}".` } };
    }

    const userIds = profiles.map((p: any) => p.user_id);
    const today = todayISO();
    const [{ data: roles }, { data: appts }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
      supabase
        .from('appointments')
        .select('staff_user_id')
        .in('staff_user_id', userIds)
        .gte('appointment_date', today)
        .neq('status', 'cancelled'),
    ]);

    const apptCounts: Record<string, number> = {};
    (appts || []).forEach((a: any) => {
      apptCounts[a.staff_user_id] = (apptCounts[a.staff_user_id] || 0) + 1;
    });
    const rolesByUser: Record<string, string[]> = {};
    (roles || []).forEach((r: any) => {
      (rolesByUser[r.user_id] ||= []).push(r.role);
    });

    const matches = profiles.map((p: any) => ({
      user_id: p.user_id,
      member_id: p.user_id,
      member_name: p.display_name || p.full_name,
      full_name: p.full_name,
      display_name: p.display_name,
      hire_date: p.hire_date,
      is_active: p.is_active,
      is_account_owner: !!p.is_super_admin,
      roles: rolesByUser[p.user_id] || [],
      upcoming_appointment_count: apptCounts[p.user_id] || 0,
    }));

    return {
      data: {
        matches,
        message:
          matches.length === 1
            ? 'Found one match.'
            : `Found ${matches.length} matches — confirm which person before proposing any action.`,
      },
    };
  },
});

// ============================================================
// team.deactivate_member  (mutation)
// ============================================================
registerCapability('team.deactivate_member', {
  propose: async ({
    supabase,
    organizationId,
    userId,
    capability,
    params,
  }: ProposeContext): Promise<ProposeResult> => {
    const memberId = String(params.member_id || '');
    if (!memberId) throw new Error('member_id is required.');

    const { data: profile, error } = await supabase
      .from('employee_profiles')
      .select('user_id, full_name, display_name, hire_date, is_active, is_super_admin, organization_id')
      .eq('user_id', memberId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) throw new Error('That team member is not in this organization.');
    if (profile.is_super_admin)
      throw new Error('The Account Owner cannot be deactivated through chat.');
    if (profile.user_id === userId)
      throw new Error('You cannot deactivate your own account from chat.');
    if (profile.is_active === false)
      throw new Error(`${profile.display_name || profile.full_name} is already inactive.`);

    const today = todayISO();
    const { count: upcomingCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('staff_user_id', profile.user_id)
      .gte('appointment_date', today)
      .neq('status', 'cancelled');

    const memberName = profile.display_name || profile.full_name;
    const reason = (params.reason as string | undefined) || null;
    const firstName = (memberName || '').split(' ')[0] || memberName;

    return {
      message: "I've prepared the deactivation. Please confirm below.",
      preview: {
        title: capability.display_name,
        description: renderPreview(capability.preview_template, {
          member_name: memberName,
          reason,
        }),
        risk_level: capability.risk_level,
        target: {
          name: memberName,
          hire_date: profile.hire_date,
          upcoming_appointments: upcomingCount || 0,
          reason,
        },
      },
      params: {
        member_id: profile.user_id,
        member_name: memberName,
        reason,
      },
      confirmation_token: firstName,
    };
  },
  execute: async ({ supabase, organizationId, params }: ExecuteContext): Promise<ExecuteResult> => {
    const memberId = String(params.member_id || '');
    const memberName = String(params.member_name || 'team member');

    const { error } = await supabase
      .from('employee_profiles')
      .update({ is_active: false })
      .eq('user_id', memberId)
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, message: 'Failed to deactivate team member.' };
    }
    return {
      success: true,
      message: `Deactivated ${memberName}. Login revoked, historical data preserved.`,
      data: { member_id: memberId, new_is_active: false },
    };
  },
});

// ============================================================
// team.reactivate_member  (mutation)
// ============================================================
registerCapability('team.reactivate_member', {
  propose: async ({
    supabase,
    organizationId,
    capability,
    params,
  }: ProposeContext): Promise<ProposeResult> => {
    const memberId = String(params.member_id || '');
    if (!memberId) throw new Error('member_id is required.');

    const { data: profile, error } = await supabase
      .from('employee_profiles')
      .select('user_id, full_name, display_name, is_active, organization_id')
      .eq('user_id', memberId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) throw new Error('That team member is not in this organization.');
    if (profile.is_active === true)
      throw new Error(`${profile.display_name || profile.full_name} is already active.`);

    const memberName = profile.display_name || profile.full_name;
    return {
      message: "I've prepared the reactivation. Please confirm below.",
      preview: {
        title: capability.display_name,
        description: renderPreview(capability.preview_template, { member_name: memberName }),
        risk_level: capability.risk_level,
        target: { name: memberName },
      },
      params: { member_id: profile.user_id, member_name: memberName },
    };
  },
  execute: async ({ supabase, organizationId, params }: ExecuteContext): Promise<ExecuteResult> => {
    const memberId = String(params.member_id || '');
    const memberName = String(params.member_name || 'team member');

    const { error } = await supabase
      .from('employee_profiles')
      .update({ is_active: true })
      .eq('user_id', memberId)
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, message: 'Failed to reactivate team member.' };
    }
    return {
      success: true,
      message: `Reactivated ${memberName}. They can log in and be assigned work again.`,
      data: { member_id: memberId, new_is_active: true },
    };
  },
});

// ============================================================
// appointments.find_today  (read)
// ============================================================
registerCapability('appointments.find_today', {
  read: async ({ supabase, params }: ProposeContext): Promise<ReadResult> => {
    const date = todayISO();
    let query = supabase
      .from('appointments')
      .select('id, client_name, service_name, appointment_date, start_time, end_time, staff_name, status')
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (params.staff_user_id) query = query.eq('staff_user_id', params.staff_user_id);
    if (params.location_id) query = query.eq('location_id', params.location_id);

    const { data, error } = await query;
    if (error) throw error;
    return { data: { date, appointments: data || [] } };
  },
});

// ============================================================
// appointments.reschedule  (mutation)
// ============================================================
registerCapability('appointments.reschedule', {
  propose: async ({
    supabase,
    organizationId,
    userId,
    capability,
    params,
    roleSet,
  }: ProposeContext): Promise<ProposeResult> => {
    const appointmentId = String(params.appointment_id || '');
    if (!appointmentId) throw new Error('appointment_id is required.');

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, client_name, service_name, appointment_date, start_time, end_time, staff_name, staff_user_id, location_id, status, organization_id')
      .eq('id', appointmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) throw new Error('Appointment not found in your organization.');
    if (appointment.status === 'cancelled') throw new Error('Appointment is already cancelled.');
    assertOwnership(capability, userId, appointment.staff_user_id, roleSet);

    const newDate = parseDateString(String(params.new_date));
    const newTime = parseTimeString(String(params.new_time));

    return {
      message: "I've prepared the reschedule. Please confirm below.",
      preview: {
        title: capability.display_name,
        description: renderPreview(capability.preview_template, {
          client_name: appointment.client_name,
          new_date: newDate,
          new_time: newTime,
        }),
        risk_level: capability.risk_level,
        before: {
          date: appointment.appointment_date,
          time: appointment.start_time,
          client: appointment.client_name,
          service: appointment.service_name,
          stylist: appointment.staff_name,
        },
        after: {
          date: newDate,
          time: newTime,
          client: appointment.client_name,
          service: appointment.service_name,
          stylist: appointment.staff_name,
        },
      },
      params: {
        appointment_id: appointment.id,
        client_name: appointment.client_name,
        new_date: newDate,
        new_time: newTime,
        staff_user_id: appointment.staff_user_id,
        location_id: appointment.location_id,
      },
    };
  },
  execute: async ({ supabase, organizationId, userId, capability, params, roleSet }: ExecuteContext): Promise<ExecuteResult> => {
    const appointmentId = String(params.appointment_id || '');
    const newDate = String(params.new_date);
    const newTime = String(params.new_time);

    // Re-verify org + ownership at execute time (defense in depth).
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, staff_user_id, status, organization_id')
      .eq('id', appointmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (apptErr || !appt) return { success: false, message: 'Appointment not found in your organization.' };
    if (appt.status === 'cancelled') return { success: false, message: 'Appointment is already cancelled.' };
    try { assertOwnership(capability, userId, appt.staff_user_id, roleSet); }
    catch (e: any) { return { success: false, message: e.message }; }

    const staffUserId = (params.staff_user_id as string | undefined) || appt.staff_user_id;

    const start = new Date(`2000-01-01T${newTime}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const endTime = end.toTimeString().split(' ')[0];

    if (staffUserId) {
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('staff_user_id', staffUserId)
        .eq('appointment_date', newDate)
        .neq('id', appointmentId)
        .neq('status', 'cancelled')
        .or(`and(start_time.lt.${endTime},end_time.gt.${newTime})`);
      if (conflicts && conflicts.length > 0) {
        return {
          success: false,
          message: "There's a scheduling conflict at the new time. Pick a different slot.",
        };
      }
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        start_time: newTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('organization_id', organizationId);

    if (error) return { success: false, message: 'Failed to reschedule appointment.' };
    return {
      success: true,
      message: `Rescheduled ${params.client_name || 'appointment'} to ${newDate} at ${newTime}.`,
    };
  },
});

// ============================================================
// appointments.cancel  (mutation)
// ============================================================
registerCapability('appointments.cancel', {
  propose: async ({
    supabase,
    capability,
    params,
  }: ProposeContext): Promise<ProposeResult> => {
    const appointmentId = String(params.appointment_id || '');
    if (!appointmentId) throw new Error('appointment_id is required.');

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, client_name, service_name, appointment_date, start_time, staff_name, status')
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) throw new Error('Appointment not found.');
    if (appointment.status === 'cancelled') throw new Error('Appointment is already cancelled.');

    const reason = (params.reason as string | undefined) || null;

    return {
      message: "I've prepared the cancellation. Please confirm below.",
      preview: {
        title: capability.display_name,
        description: renderPreview(capability.preview_template, {
          client_name: appointment.client_name,
          reason,
        }),
        risk_level: capability.risk_level,
        before: {
          date: appointment.appointment_date,
          time: appointment.start_time,
          client: appointment.client_name,
          service: appointment.service_name,
          stylist: appointment.staff_name,
        },
      },
      params: {
        appointment_id: appointment.id,
        client_name: appointment.client_name,
        reason,
      },
    };
  },
  execute: async ({ supabase, params }: ExecuteContext): Promise<ExecuteResult> => {
    const appointmentId = String(params.appointment_id || '');
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);
    if (error) return { success: false, message: 'Failed to cancel appointment.' };
    return {
      success: true,
      message: `Cancelled ${params.client_name || 'appointment'}.`,
    };
  },
});
