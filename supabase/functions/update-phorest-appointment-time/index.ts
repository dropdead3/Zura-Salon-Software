import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PHOREST_BASE_URL = "https://api-gateway-eu.phorest.com/third-party-api-server/api/business";

// ── GLOBAL SAFETY KILL SWITCH ──
const PHOREST_WRITES_GLOBALLY_DISABLED = true;

interface RescheduleRequest {
  appointment_id: string;
  new_date: string;
  new_time: string;
  new_staff_id?: string;
}

async function phorestRequest(
  endpoint: string,
  businessId: string,
  username: string,
  password: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const url = `${PHOREST_BASE_URL}/${businessId}${endpoint}`;
  const auth = btoa(`${username}:${password}`);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Phorest API error: ${response.status} - ${errorText}`);
    throw new Error(`Phorest API error: ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PHOREST_BUSINESS_ID = Deno.env.get("PHOREST_BUSINESS_ID");
    const PHOREST_USERNAME = Deno.env.get("PHOREST_USERNAME");
    const PHOREST_PASSWORD = Deno.env.get("PHOREST_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PHOREST_BUSINESS_ID || !PHOREST_USERNAME || !PHOREST_PASSWORD) {
      throw new Error("Phorest credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) as any;
    const body: RescheduleRequest = await req.json();
    const { appointment_id, new_date, new_time, new_staff_id } = body;

    if (!appointment_id || !new_date || !new_time) {
      throw new Error("Missing required fields: appointment_id, new_date, new_time");
    }

    // ── Source-aware table routing ──
    // Try native appointments table first, fall back to phorest_appointments
    let targetTable: "appointments" | "phorest_appointments" = "phorest_appointments";
    let localApt: any = null;

    // 1) Try native appointments table
    const { data: nativeApt, error: nativeErr } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .maybeSingle();

    if (nativeApt) {
      targetTable = "appointments";
      localApt = nativeApt;
      console.log(`Found appointment in native 'appointments' table`);
    }

    // 2) Fall back to phorest_appointments
    if (!localApt) {
      const { data: phorestApt, error: fetchError } = await supabase
        .from("phorest_appointments")
        .select("*")
        .eq("id", appointment_id)
        .single();

      if (fetchError || !phorestApt) {
        throw new Error("Appointment not found in either table");
      }
      localApt = phorestApt;
      console.log(`Found appointment in 'phorest_appointments' table`);
    }

    // Calculate new end time based on original duration
    const [startHour, startMin] = new_time.split(":").map(Number);
    const [origStartHour, origStartMin] = localApt.start_time.split(":").map(Number);
    const [origEndHour, origEndMin] = localApt.end_time.split(":").map(Number);
    
    const durationMinutes = (origEndHour * 60 + origEndMin) - (origStartHour * 60 + origStartMin);
    const newEndMinutes = startHour * 60 + startMin + durationMinutes;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMin = newEndMinutes % 60;
    const new_end_time = `${newEndHour.toString().padStart(2, "0")}:${newEndMin.toString().padStart(2, "0")}`;

    // Prepare update payload with reschedule history
    const updatePayload: any = {
      appointment_date: new_date,
      start_time: new_time,
      end_time: new_end_time,
      rescheduled_from_date: localApt.appointment_date,
      rescheduled_from_time: localApt.start_time,
      rescheduled_at: new Date().toISOString(),
    };

    // If staff is changing, resolve the new staff
    if (new_staff_id && new_staff_id !== (localApt.stylist_user_id || localApt.staff_user_id)) {
      if (targetTable === "appointments") {
        // Native table uses staff_user_id directly
        updatePayload.staff_user_id = new_staff_id;
        // Also update staff_name
        const { data: staffProfile } = await supabase
          .from("employee_profiles")
          .select("display_name")
          .eq("user_id", new_staff_id)
          .maybeSingle();
        if (staffProfile?.display_name) {
          updatePayload.staff_name = staffProfile.display_name;
        }
      } else {
        // Phorest table — look up phorest_staff_id from mapping
        const { data: staffMapping } = await supabase
          .from("phorest_staff_mapping")
          .select("phorest_staff_id")
          .eq("user_id", new_staff_id)
          .eq("is_active", true)
          .single();

        if (staffMapping) {
          updatePayload.stylist_user_id = new_staff_id;
          updatePayload.phorest_staff_id = staffMapping.phorest_staff_id;
        }
      }
    }

    // Check write-gate from org settings
    let phorestWriteEnabled = false;
    try {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("settings")
        .limit(1)
        .single();
      const settings = (orgData?.settings || {}) as Record<string, any>;
      phorestWriteEnabled = settings.phorest_write_enabled === true;
    } catch (e) {
      console.log("Could not resolve org for write-gate check, defaulting to disabled");
    }

    // GLOBAL SAFETY OVERRIDE
    if (PHOREST_WRITES_GLOBALLY_DISABLED) {
      phorestWriteEnabled = false;
      console.warn("GLOBAL SAFETY: Phorest writes are disabled at code level");
    }

    // Try to update in Phorest if write-back is enabled
    let phorestUpdated = false;
    if (phorestWriteEnabled && localApt.phorest_id) {
      try {
        await phorestRequest(
          `/appointment/${localApt.phorest_id}`,
          PHOREST_BUSINESS_ID,
          PHOREST_USERNAME,
          PHOREST_PASSWORD,
          "PATCH",
          {
            startTime: `${new_date}T${new_time}:00`,
            staffId: localApt.phorest_staff_id,
          }
        );
        phorestUpdated = true;
        console.log("Successfully updated appointment in Phorest");
      } catch (phorestError) {
        console.error("Failed to update Phorest, updating local only:", phorestError);
      }
    } else if (!phorestWriteEnabled) {
      console.log("Phorest write-back disabled, local-only update");
    }

    // Update local database (source-aware table)
    console.log(`Updating ${targetTable} id=${appointment_id}`, JSON.stringify(updatePayload));
    const { error: updateError } = await supabase
      .from(targetTable)
      .update(updatePayload)
      .eq("id", appointment_id);

    if (updateError) {
      throw new Error(`Failed to update local appointment: ${updateError.message}`);
    }

    // Cross-table sync: if we updated phorest_appointments, also sync to appointments via external_id
    if (targetTable === "phorest_appointments" && localApt.phorest_id) {
      try {
        await supabase
          .from("appointments")
          .update({
            appointment_date: new_date,
            start_time: new_time,
            end_time: new_end_time,
            updated_at: new Date().toISOString(),
          })
          .eq("external_id", localApt.phorest_id);
      } catch (_) { /* non-fatal */ }
    } else if (targetTable === "appointments" && localApt.external_id) {
      try {
        await supabase
          .from("phorest_appointments")
          .update({
            appointment_date: new_date,
            start_time: new_time,
            end_time: new_end_time,
            updated_at: new Date().toISOString(),
          })
          .eq("phorest_id", localApt.external_id);
      } catch (_) { /* non-fatal */ }
    }

    // Write audit log entry for reschedule
    try {
      let auditOrgId: string | null = localApt.organization_id || null;
      if (!auditOrgId && localApt.location_id) {
        const { data: locData } = await supabase
          .from("locations")
          .select("organization_id")
          .eq("id", localApt.location_id)
          .maybeSingle();
        auditOrgId = locData?.organization_id || null;
      }
      if (!auditOrgId) {
        const { data: orgFallback } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)
          .single();
        auditOrgId = orgFallback?.id || null;
      }

      if (auditOrgId) {
        await supabase.from("appointment_audit_log").insert({
          appointment_id,
          organization_id: auditOrgId,
          event_type: "rescheduled",
          actor_name: "System",
          previous_value: { date: localApt.appointment_date, time: localApt.start_time },
          new_value: { date: new_date, time: new_time },
        });
      }
    } catch (auditErr) {
      console.log("Audit log write failed (non-fatal):", auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        phorest_updated: phorestUpdated,
        appointment_id,
        new_date,
        new_time,
        new_end_time,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error("Error rescheduling appointment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
