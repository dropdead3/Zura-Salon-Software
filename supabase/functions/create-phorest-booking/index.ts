import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";

// ── GLOBAL SAFETY KILL SWITCH ──
// When true, ALL Phorest write-back calls are blocked at the code level,
// regardless of the organization's phorest_write_enabled setting.
// Change to false and redeploy when ready to enable Phorest writes.
const PHOREST_WRITES_GLOBALLY_DISABLED = true;

interface BookingRequest {
  branch_id?: string;
  client_id?: string;
  staff_id?: string;
  service_ids: string[];
  start_time: string;
  notes?: string;
  location_id?: string;
  // Native mode fields (Phorest-free booking)
  staff_user_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  native_client_id?: string;
  // Redo / adjustment fields
  is_redo?: boolean;
  redo_reason?: string;
  original_appointment_id?: string;
  redo_pricing_override?: number;
  redo_requires_approval?: boolean;
  redo_is_manager?: boolean;
}

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
    
    try {
      const errorJson = JSON.parse(responseText);
      const errorCode = errorJson.errorCode || errorJson.code;
      
      if (errorCode === 'STAFF_DOUBLE_BOOKED') {
        throw new Error('This time slot is already booked for the selected stylist.');
      } else if (errorCode === 'STAFF_UNQUALIFIED') {
        throw new Error('The selected stylist is not qualified to perform this service.');
      } else if (errorCode === 'CLIENT_ALREADY_BOOKED') {
        throw new Error('This client already has an appointment at this time.');
      } else if (errorCode === 'BRANCH_CLOSED') {
        throw new Error('The salon is closed at the requested time.');
      }
      
      throw new Error(errorJson.message || `Phorest API error: ${response.status}`);
    } catch (e: any) {
      if (e.message.includes('already booked') || e.message.includes('qualified')) {
        throw e;
      }
      throw new Error(`Phorest API error: ${response.status} - ${responseText}`);
    }
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bookingData: BookingRequest = await req.json();
    const { branch_id, client_id, staff_id, service_ids, start_time, notes, location_id: clientLocationId, is_redo, redo_reason, original_appointment_id, redo_pricing_override, redo_requires_approval, redo_is_manager } = bookingData;

    if (!branch_id || !client_id || !staff_id || !service_ids?.length || !start_time) {
      throw new Error("Missing required fields: branch_id, client_id, staff_id, service_ids, start_time");
    }

    console.log(`Creating booking for client ${client_id} with staff ${staff_id} at ${start_time}`);

    // Check write-gate: look up org settings via branch_id -> locations -> organizations
    let phorestWriteEnabled = false;
    try {
      const { data: locData } = await supabase
        .from("locations")
        .select("id, organization_id")
        .eq("phorest_branch_id", branch_id)
        .maybeSingle();

      if (locData?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("settings")
          .eq("id", locData.organization_id)
          .single();
        const settings = (orgData?.settings || {}) as Record<string, any>;
      phorestWriteEnabled = settings.phorest_write_enabled === true;
      }
    } catch (e) {
      console.log("Could not resolve org for write-gate check, defaulting to disabled");
    }

    // GLOBAL SAFETY OVERRIDE
    if (PHOREST_WRITES_GLOBALLY_DISABLED) {
      phorestWriteEnabled = false;
      console.warn("GLOBAL SAFETY: Phorest writes are disabled at code level");
    }

    // --- Redo validation ---
    let redoFinalPrice: number | null = null;
    let redoOriginalPrice: number | null = null;
    
    if (is_redo && original_appointment_id) {
      // Fetch original appointment
      const { data: origAppt } = await supabase
        .from("appointments")
        .select("appointment_date, total_price, organization_id")
        .eq("id", original_appointment_id)
        .single();

      if (origAppt) {
        redoOriginalPrice = origAppt.total_price;

        // Validate redo window
        const { data: orgData } = await supabase
          .from("organizations")
          .select("settings")
          .eq("id", origAppt.organization_id)
          .single();

        const settings = (orgData?.settings || {}) as Record<string, any>;
        const windowDays = settings.redo_window_days ?? 14;
        const origDate = new Date(origAppt.appointment_date);
        const daysDiff = Math.floor((Date.now() - origDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff > windowDays && !redo_is_manager) {
          throw new Error(`Redo window expired. Original appointment is ${daysDiff} days old (limit: ${windowDays} days).`);
        }

        // Calculate redo pricing
        if (redo_pricing_override != null) {
          redoFinalPrice = redo_pricing_override;
        } else {
          const policy = settings.redo_pricing_policy || 'free';
          const pct = settings.redo_pricing_percentage ?? 50;
          if (policy === 'free') redoFinalPrice = 0;
          else if (policy === 'percentage' && redoOriginalPrice != null) redoFinalPrice = redoOriginalPrice * (pct / 100);
          else redoFinalPrice = redoOriginalPrice;
        }
      }
    }

    // Determine appointment status (pending if redo requires approval and user is not manager)
    let appointmentStatus = 'booked';
    if (is_redo && redo_requires_approval && !redo_is_manager) {
      appointmentStatus = 'pending';
    }

    // Build the booking request body
    const phorestBooking = {
      clientId: client_id,
      staffId: staff_id,
      startTime: start_time,
      services: service_ids.map(id => ({ serviceId: id })),
      notes: notes || undefined,
      status: 'CONFIRMED',
    };

    // Create booking in Phorest (only if write-back is enabled)
    let response: any = {};
    if (phorestWriteEnabled) {
      response = await phorestRequest(
        `/branch/${branch_id}/appointment`,
        businessId,
        username,
        password,
        "POST",
        phorestBooking
      );
      console.log("Booking created in Phorest:", response);
    } else {
      console.log("Phorest write-back disabled for this organization, local-only booking created");
      response = { id: `native-${crypto.randomUUID()}` };
    }

    // Get service details for local record
    const { data: services } = await supabase
      .from("phorest_services")
      .select("name, duration_minutes, price, category")
      .in("phorest_service_id", service_ids);

    const totalDuration = services?.reduce((sum, s) => sum + (s.duration_minutes || 60), 0) || 60;
    const serviceName = services?.map(s => s.name).join(', ') || 'Service';

    // Determine service_category from service data
    let serviceCategory: string | null = null;
    if (services && services.length > 0) {
      const categories = [...new Set(services.map(s => s.category).filter(Boolean))];
      if (categories.length === 1) {
        serviceCategory = categories[0];
      } else if (categories.length > 1) {
        const sorted = [...services].sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
        serviceCategory = sorted[0].category || null;
      }
    }

    // Get staff mapping
    const { data: staffMapping } = await supabase
      .from("phorest_staff_mapping")
      .select("user_id")
      .eq("phorest_staff_id", staff_id)
      .single();

    // Get client name
    const { data: client } = await supabase
      .from("phorest_clients")
      .select("name, phone")
      .eq("phorest_client_id", client_id)
      .single();

    // Calculate end time
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);
    const appointmentDate = start_time.split('T')[0];
    const startTimeLocal = start_time.split('T')[1]?.substring(0, 5) || '09:00';
    const endTimeLocal = endDate.toISOString().split('T')[1]?.substring(0, 5);

    // Create local record
    const appointmentId = response.appointmentId || response.id || `local-${Date.now()}`;
    
    // Resolve location_id from branch_id, with client-provided fallback
    let resolvedLocationId: string | null = clientLocationId || null;
    if (!resolvedLocationId) {
      try {
        const { data: locLookup } = await supabase
          .from("locations")
          .select("id")
          .eq("phorest_branch_id", branch_id)
          .maybeSingle();
        resolvedLocationId = locLookup?.id || null;
      } catch (_e) {
        console.log("Could not resolve location_id from branch_id");
      }
    }

    const localRecord: Record<string, any> = {
      phorest_id: appointmentId,
      stylist_user_id: staffMapping?.user_id || null,
      phorest_staff_id: staff_id,
      client_name: client?.name || 'Client',
      client_phone: client?.phone || null,
      appointment_date: appointmentDate,
      start_time: startTimeLocal,
      end_time: endTimeLocal,
      service_name: serviceName,
      service_category: serviceCategory,
      status: appointmentStatus,
      notes: notes || null,
      location_id: resolvedLocationId,
      is_redo: is_redo || false,
      redo_reason: is_redo ? redo_reason || null : null,
      original_appointment_id: is_redo ? original_appointment_id || null : null,
      redo_pricing_override: is_redo ? (redoFinalPrice ?? redo_pricing_override ?? null) : null,
    };

    if (redoOriginalPrice != null) {
      localRecord.original_price = redoOriginalPrice;
    }
    if (redoFinalPrice != null) {
      localRecord.total_price = redoFinalPrice;
    }

    // Extract auth user from request header for created_by
    const authHeader = req.headers.get("authorization") || "";
    let createdByUserId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const { data: { user: reqUser } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        createdByUserId = reqUser?.id || null;
      } catch (_) { /* ignore */ }
    }
    if (createdByUserId) {
      localRecord.created_by = createdByUserId;
    }

    const { data: insertedRecord, error: insertError } = await supabase
      .from("phorest_appointments")
      .upsert(localRecord, { onConflict: 'phorest_id' })
      .select('id')
      .maybeSingle();

    if (insertError) {
      console.error("Failed to create local record:", insertError);
    }

    // Write audit log entry
    const insertedId = insertedRecord?.id || null;
    if (insertedId) {
      try {
        // Resolve org_id
        let auditOrgId: string | null = null;
        if (resolvedLocationId) {
          const { data: locOrg } = await supabase.from("locations").select("organization_id").eq("id", resolvedLocationId).maybeSingle();
          auditOrgId = locOrg?.organization_id || null;
        }
        if (!auditOrgId) {
          const { data: orgFallback } = await supabase.from("organizations").select("id").limit(1).single();
          auditOrgId = orgFallback?.id || null;
        }
        if (auditOrgId) {
          await supabase.from("appointment_audit_log").insert({
            appointment_id: insertedId,
            organization_id: auditOrgId,
            event_type: "created",
            actor_user_id: createdByUserId,
            actor_name: "System",
            new_value: { service: serviceName, client: client?.name || 'Client', date: appointmentDate, time: startTimeLocal },
          });
        }
      } catch (auditErr) {
        console.log("Audit log write failed (non-fatal):", auditErr);
      }
    }

    // --- Manager notification for redo ---
    if (is_redo) {
      try {
        // Look up org from location
        const { data: locData } = await supabase
          .from("locations")
          .select("organization_id")
          .eq("phorest_branch_id", branch_id)
          .maybeSingle();

        if (locData?.organization_id) {
          const { data: orgSettings } = await supabase
            .from("organizations")
            .select("settings")
            .eq("id", locData.organization_id)
            .single();

          const s = (orgSettings?.settings || {}) as Record<string, any>;
          if (s.redo_notification_enabled !== false) {
            // Insert in-app notification for managers
            const { data: managers } = await supabase
              .from("user_roles")
              .select("user_id")
              .in("role", ["admin", "manager", "super_admin"]);

            if (managers && managers.length > 0) {
              const notifications = managers.map((m) => ({
                user_id: m.user_id,
                type: 'redo_booking',
                title: 'Redo Appointment Booked',
                message: `Redo for ${client?.name || 'Client'}: ${redo_reason || 'No reason'}. Service: ${serviceName}.`,
                severity: 'info',
                metadata: { appointment_id: appointmentId, redo_reason, original_appointment_id },
              }));

              await supabase.from("notifications").insert(notifications).throwOnError().catch(() => {
                // notifications table may not exist yet, silently ignore
                console.log("[redo] Notification insert skipped (table may not exist)");
              });
            }
          }
        }
      } catch (notifErr) {
        console.log("[redo] Notification error (non-fatal):", notifErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointmentId,
        message: "Booking created successfully",
        appointment: localRecord,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Booking creation error:", error);
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
