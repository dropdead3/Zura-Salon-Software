import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const ExecuteActionSchema = z.object({
  actionType: z.enum([
    "reschedule",
    "cancel",
    "confirm",
    "no_show",
    "deactivate_team_member",
    "reactivate_team_member",
  ]),
  params: z.record(z.unknown()),
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  actionId: z.string().uuid().optional(),
});

const HR_ACTION_TYPES = new Set(["deactivate_team_member", "reactivate_team_member"]);

async function callerCanManageTeam(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  callerUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', callerUserId);
  if (error || !data) return false;
  return data.some((r: { role: string }) => r.role === 'admin' || r.role === 'super_admin');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr: any) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as any;
    
    const body = await validateBody(req, ExecuteActionSchema, getCorsHeaders(req));
    const { actionType, params, userId, organizationId, actionId } = body;
    // Verify org access
    try {
      const orgId = body.organizationId || body.organization_id;
      if (!orgId) {
        return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
      }
      await requireOrgMember(supabaseAdmin, user.id, orgId);
    } catch (orgErr: any) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }

    let result: { success: boolean; message: string; data?: unknown };

    switch (actionType) {
      case 'reschedule': {
        const { appointment_id, new_date, new_time, staff_user_id, location_id } = params;
        
        // Validate appointment still exists
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select('id, client_name, status')
          .eq('id', appointment_id)
          .single();
        
        if (fetchError || !appointment) {
          result = { success: false, message: "Appointment not found or already cancelled" };
          break;
        }
        
        if (appointment.status === 'cancelled') {
          result = { success: false, message: "This appointment has already been cancelled" };
          break;
        }
        
        // Calculate end time (assume 1 hour duration for now)
        const startTime = new Date(`2000-01-01T${new_time}`);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        const endTimeStr = endTime.toTimeString().split(' ')[0];
        
        // Check for conflicts
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id')
          .eq('staff_user_id', staff_user_id)
          .eq('appointment_date', new_date)
          .neq('id', appointment_id)
          .neq('status', 'cancelled')
          .or(`and(start_time.lt.${endTimeStr},end_time.gt.${new_time})`);
        
        if (conflicts && conflicts.length > 0) {
          result = { 
            success: false, 
            message: "There's a scheduling conflict at the new time. Please choose a different time." 
          };
          break;
        }
        
        // Update the appointment
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            appointment_date: new_date,
            start_time: new_time,
            end_time: endTimeStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment_id);
        
        if (updateError) {
          console.error("Reschedule error:", updateError);
          result = { success: false, message: "Failed to reschedule appointment" };
          break;
        }
        
        result = { 
          success: true, 
          message: `Successfully rescheduled ${appointment.client_name}'s appointment to ${new_date} at ${formatTime(String(new_time ?? ''))}` 
        };
        break;
      }

      case 'cancel': {
        const { appointment_id } = params;
        
        // Validate appointment exists
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select('id, client_name, status')
          .eq('id', appointment_id)
          .single();
        
        if (fetchError || !appointment) {
          result = { success: false, message: "Appointment not found" };
          break;
        }
        
        if (appointment.status === 'cancelled') {
          result = { success: false, message: "This appointment has already been cancelled" };
          break;
        }
        
        // Cancel the appointment
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment_id);
        
        if (updateError) {
          console.error("Cancel error:", updateError);
          result = { success: false, message: "Failed to cancel appointment" };
          break;
        }
        
        result = { 
          success: true, 
          message: `Successfully cancelled ${appointment.client_name}'s appointment` 
        };
        break;
      }

      case 'deactivate_team_member':
      case 'reactivate_team_member': {
        const orgId = (body.organizationId || body.organization_id)!;
        const targetUserId = params.user_id as string | undefined;
        const setActive = actionType === 'reactivate_team_member';

        if (!targetUserId) {
          result = { success: false, message: 'user_id is required.' };
          break;
        }

        const canManage = await callerCanManageTeam(supabase, user.id);
        if (!canManage) {
          result = { success: false, message: 'You need an admin or owner role to manage team members.' };
          break;
        }

        if (targetUserId === user.id) {
          result = { success: false, message: 'You cannot change your own active status from chat.' };
          break;
        }

        const { data: target, error: targetErr } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, is_active, is_super_admin, organization_id')
          .eq('user_id', targetUserId)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (targetErr || !target) {
          result = { success: false, message: 'Team member not found in this organization.' };
          break;
        }

        if (target.is_super_admin && !setActive) {
          result = { success: false, message: 'The Account Owner cannot be deactivated through chat. Use Settings → Team Members.' };
          break;
        }

        if (target.is_active === setActive) {
          result = { success: false, message: `${target.display_name || target.full_name} is already ${setActive ? 'active' : 'inactive'}.` };
          break;
        }

        const { error: updateErr } = await supabase
          .from('employee_profiles')
          .update({ is_active: setActive })
          .eq('user_id', targetUserId)
          .eq('organization_id', orgId);

        if (updateErr) {
          console.error('Team-member status update error:', updateErr);
          result = { success: false, message: `Failed to ${setActive ? 'reactivate' : 'deactivate'} team member.` };
          break;
        }

        result = {
          success: true,
          message: setActive
            ? `Reactivated ${target.display_name || target.full_name}. They can log in and be assigned work again.`
            : `Deactivated ${target.display_name || target.full_name}. Login revoked, historical data preserved.`,
          data: {
            target_user_id: targetUserId,
            new_is_active: setActive,
          },
        };
        break;
      }

      default:
        result = { success: false, message: `Unknown action type: ${actionType}` };
    }

    // Update action record if actionId provided
    if (actionId) {
      await supabase
        .from('ai_agent_actions')
        .update({
          status: result.success ? 'executed' : 'failed',
          result: result,
          executed_at: result.success ? new Date().toISOString() : null,
          error_message: result.success ? null : result.message
        })
        .eq('id', actionId);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("execute-ai-action error:", e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e instanceof Error ? e.message : "Unknown error" 
      }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}
