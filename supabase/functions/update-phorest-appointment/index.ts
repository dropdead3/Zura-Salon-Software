import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";

// ── GLOBAL SAFETY KILL SWITCH ──
// When true, ALL Phorest write-back calls are blocked at the code level,
// regardless of the organization's phorest_write_enabled setting.
// Change to false and redeploy when ready to enable Phorest writes.
const PHOREST_WRITES_GLOBALLY_DISABLED = true;

interface ServicePayload {
  name: string;
  price?: number | null;
  duration_minutes?: number | null;
  category?: string | null;
}

interface UpdateRequest {
  appointment_id: string;
  status?: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  rebooked_at_checkout?: boolean;
  tip_amount?: number;
  rebook_declined_reason?: string | null;
  services?: ServicePayload[];
}

// Map our local status names to Phorest status names
const statusToPhorest: Record<string, string> = {
  'confirmed': 'CONFIRMED',
  'checked_in': 'CHECKED_IN',
  'completed': 'COMPLETED',
  'cancelled': 'CANCELLED',
  'no_show': 'NO_SHOW',
};

// Map Phorest status names to our local status names
const statusFromPhorest: Record<string, string> = {
  'CONFIRMED': 'confirmed',
  'CHECKED_IN': 'checked_in',
  'COMPLETED': 'completed',
  'CANCELLED': 'cancelled',
  'NO_SHOW': 'no_show',
};

async function phorestRequest(
  endpoint: string, 
  businessId: string, 
  username: string, 
  password: string,
  method: string = "GET",
  body?: any
) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const url = `${PHOREST_BASE_URL}/business/${businessId}${endpoint}`;
  console.log(`Phorest ${method} request: ${url}`);
  
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Phorest API error (${response.status}):`, responseText);
    throw new Error(`Phorest API error: ${response.status} - ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const businessId = Deno.env.get("PHOREST_BUSINESS_ID");
    const username = Deno.env.get("PHOREST_USERNAME");
    const password = Deno.env.get("PHOREST_API_KEY");

    if (!businessId || !username || !password) {
      throw new Error("Missing Phorest credentials");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service-role client for admin-level writes (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as any;

    const updateData: UpdateRequest = await req.json();
    const { appointment_id, status, notes, rebooked_at_checkout, tip_amount, rebook_declined_reason, services } = updateData;

    if (!appointment_id) {
      throw new Error("Missing required field: appointment_id");
    }

    if (!status && notes === undefined && rebooked_at_checkout === undefined && tip_amount === undefined && !services) {
      throw new Error("At least one of status, notes, rebooked_at_checkout, tip_amount, or services must be provided");
    }

    console.log(`Updating appointment ${appointment_id}: status=${status}, notes=${notes ? 'yes' : 'no'}`);

    // Build update body for Phorest
    const updateBody: Record<string, any> = {};
    if (status) {
      updateBody.status = statusToPhorest[status.toLowerCase()] || status;
    }
    if (notes !== undefined) {
      updateBody.notes = notes;
    }

    // ── Resolve which table / column owns this appointment ──
    // phorest_appointments has location_id (NOT organization_id),
    // so we join through the locations table to find the org.
    let phorestWriteEnabled = false;
    let targetTable: "phorest_appointments" | "appointments" = "phorest_appointments";
    let matchColumn = "phorest_id";
    let orgId: string | null = null;

    // 1) Try phorest_appointments by phorest_id
    const { data: aptByPhorestId } = await supabase
      .from("phorest_appointments")
      .select("location_id")
      .eq("phorest_id", appointment_id)
      .maybeSingle();

    if (aptByPhorestId?.location_id) {
      matchColumn = "phorest_id";
      const { data: loc } = await supabase
        .from("locations")
        .select("organization_id")
        .eq("id", aptByPhorestId.location_id)
        .maybeSingle();
      orgId = loc?.organization_id || null;
    }

    if (!orgId) {
      // 2) Try phorest_appointments by UUID id
      const { data: aptById } = await supabase
        .from("phorest_appointments")
        .select("location_id")
        .eq("id", appointment_id)
        .maybeSingle();

      if (aptById?.location_id) {
        matchColumn = "id";
        const { data: loc } = await supabase
          .from("locations")
          .select("organization_id")
          .eq("id", aptById.location_id)
          .maybeSingle();
        orgId = loc?.organization_id || null;
      }
    }

    if (!orgId) {
      // 3) Try local appointments table (has organization_id directly)
      const { data: localApt } = await supabase
        .from("appointments")
        .select("organization_id")
        .eq("id", appointment_id)
        .maybeSingle();

      if (localApt?.organization_id) {
        orgId = localApt.organization_id;
        targetTable = "appointments";
        matchColumn = "id";
      }
    }

    console.log(`Resolved: table=${targetTable}, column=${matchColumn}, orgId=${orgId}`);
    
    if (orgId) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", orgId)
        .single();
      const settings = (orgData?.settings || {}) as Record<string, any>;
      phorestWriteEnabled = settings.phorest_write_enabled === true;
    }

    // GLOBAL SAFETY OVERRIDE
    if (PHOREST_WRITES_GLOBALLY_DISABLED) {
      phorestWriteEnabled = false;
      console.warn("GLOBAL SAFETY: Phorest writes are disabled at code level");
    }

    // Update in Phorest (only if write-back is enabled)
    if (phorestWriteEnabled) {
      try {
        await phorestRequest(
          `/appointment/${appointment_id}`,
          businessId,
          username,
          password,
          "PUT",
          updateBody
        );
        console.log("Appointment updated in Phorest");
      } catch (e: any) {
        console.error("Failed to update in Phorest:", e.message);
      }
    } else {
      console.log("Phorest write-back disabled for this organization, local-only update");
    }

    // Update local record
    const localUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      const normalizedStatus = statusFromPhorest[status] || status.toLowerCase();
      localUpdate.status = normalizedStatus;
    }
    
    if (notes !== undefined) {
      localUpdate.notes = notes;
    }

    if (rebooked_at_checkout !== undefined) {
      localUpdate.rebooked_at_checkout = rebooked_at_checkout;
    }

    if (tip_amount !== undefined) {
      localUpdate.tip_amount = tip_amount;
    }

    if (rebook_declined_reason !== undefined) {
      localUpdate.rebook_declined_reason = rebook_declined_reason;
    }

    // Services update: rewrite service_name, total_price, duration_minutes, end_time
    if (services && services.length > 0) {
      // ── Status guard: block edits on terminal appointments ──
      const terminalStatuses = ['completed', 'cancelled', 'no_show'];
      const { data: currentApt } = await supabase
        .from(targetTable)
        .select("status, start_time")
        .eq(matchColumn, appointment_id)
        .maybeSingle();

      const currentStatus = (currentApt?.status || '').toLowerCase();
      if (terminalStatuses.includes(currentStatus)) {
        throw new Error(`Cannot edit services on a ${currentStatus} appointment`);
      }

      localUpdate.service_name = services.map(s => s.name).join(', ');
      const totalPrice = services.reduce((sum: any, s: any) => sum + (s.price ?? 0), 0);
      const totalDuration = services.reduce((sum: any, s: any) => sum + (s.duration_minutes ?? 0), 0);
      if (totalPrice > 0) localUpdate.total_price = totalPrice;
      if (totalDuration > 0) {
        localUpdate.duration_minutes = totalDuration;
        // Recalculate end_time from start_time + new duration
        const startTime = currentApt?.start_time;
        if (startTime) {
          const [h, m] = startTime.split(':').map(Number);
          const totalMinutes = h * 60 + m + totalDuration;
          const endH = Math.floor(totalMinutes / 60) % 24;
          const endM = totalMinutes % 60;
          localUpdate.end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
        }
      }
      localUpdate.service_category = services[0]?.category || null;
    }

    // ── Cross-table status sync ──
    // If we updated phorest_appointments, also sync status to the linked appointments row
    if (status) {
      const normalizedStatus = statusFromPhorest[status] || status.toLowerCase();
      try {
        if (targetTable === 'phorest_appointments') {
          // Find the phorest_id of the record we just updated
          const lookupCol = matchColumn as string;
          const { data: phorestRow } = await supabase
            .from('phorest_appointments')
            .select('phorest_id')
            .eq(lookupCol, appointment_id)
            .maybeSingle();

          if (phorestRow?.phorest_id) {
            // Update linked appointments row via external_id
            await supabase
              .from('appointments')
              .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
              .eq('external_id', phorestRow.phorest_id);
            console.log(`Cross-synced status "${normalizedStatus}" to appointments via external_id=${phorestRow.phorest_id}`);
          }
        } else {
          // We updated the appointments table — sync back to phorest_appointments
          const { data: localRow } = await supabase
            .from('appointments')
            .select('external_id')
            .eq('id', appointment_id)
            .maybeSingle();

          if (localRow?.external_id) {
            await supabase
              .from('phorest_appointments')
              .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
              .eq('phorest_id', localRow.external_id);
            console.log(`Cross-synced status "${normalizedStatus}" to phorest_appointments via phorest_id=${localRow.external_id}`);
          }
        }
      } catch (syncErr: any) {
        console.warn('Cross-table status sync failed (non-fatal):', syncErr.message);
      }
    }

    console.log(`Updating ${targetTable}.${matchColumn} = ${appointment_id}`, JSON.stringify(localUpdate));

    const { error: updateError, data: updatedAppointment } = await supabase
      .from(targetTable)
      .update(localUpdate)
      .eq(matchColumn, appointment_id)
      .select()
      .maybeSingle();

    if (updateError || !updatedAppointment) {
      console.error("Update failed:", updateError?.message, updateError?.details, updateError?.hint);
      
      // If primary table failed and we haven't tried the other table yet, try fallback
      if (targetTable === "phorest_appointments") {
        console.log("Fallback: trying local appointments table");
        const { error: localError, data: localAppt } = await supabase
          .from("appointments")
          .update(localUpdate)
          .eq("id", appointment_id)
          .select()
          .maybeSingle();

        if (localError || !localAppt) {
          console.error("Fallback also failed:", localError?.message);
          throw new Error("Failed to update appointment locally");
        }
      } else {
        throw new Error("Failed to update appointment locally");
      }
    }

    // ── Fire-and-forget visit stats refresh ──
    // After a status change (especially to 'completed'), refresh the cached
    // visit_count / total_spend / last_visit_date columns on `clients` so
    // the Client Directory and command-surface preview update within seconds.
    // The RPC is idempotent (IS DISTINCT FROM guards) and org-scoped, so it's
    // safe to fail silently — the next nightly sweep will catch any miss.
    // NOT awaited: must not add latency to the checkout response.
    if (orgId && status) {
      supabase
        .rpc('refresh_client_visit_stats', { p_organization_id: orgId })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.warn('refresh_client_visit_stats failed (non-fatal):', error.message);
          } else {
            const updated = Array.isArray(data) && data[0]?.updated_count;
            console.log(`refresh_client_visit_stats ok (org=${orgId}, updated=${updated ?? 0})`);
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Appointment updated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Appointment update error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
