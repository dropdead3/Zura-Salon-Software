import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Enqueue Service Emails
 * 
 * Triggered when an appointment is created, confirmed, or cancelled.
 * - On create/confirm: looks up the service's email flow, calculates step send times,
 *   and inserts rows into service_email_queue with status 'pending'.
 * - On cancel: marks all pending queue entries for that appointment as 'cancelled'.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const body = await req.json();
    const { appointmentId, action } = body; // action: 'book' | 'confirm' | 'cancel'

    if (!appointmentId) {
      throw new Error("appointmentId is required");
    }

    // Fetch appointment details with org timezone
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("id, organization_id, service_id, service_category, client_id, appointment_date, start_time, location_id, status, organizations!inner(timezone)")
      .eq("id", appointmentId)
      .single();

    if (apptError || !appointment) {
      throw new Error(`Appointment not found: ${apptError?.message}`);
    }

    // Handle cancellation: mark all pending queue items as cancelled
    if (action === "cancel" || appointment.status === "cancelled") {
      const { data: cancelled, error: cancelError } = await supabase
        .from("service_email_queue")
        .update({ status: "cancelled" })
        .eq("appointment_id", appointmentId)
        .eq("status", "pending")
        .select("id");

      console.log(`[enqueue] Cancelled ${cancelled?.length || 0} queued emails for appointment ${appointmentId}`);

      return new Response(
        JSON.stringify({ success: true, action: "cancelled", count: cancelled?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the service's email flow
    // Priority: service-specific flow > category-level flow
    let flow = null;

    if (appointment.service_id) {
      const { data } = await supabase
        .from("service_email_flows")
        .select("id, is_active")
        .eq("organization_id", appointment.organization_id)
        .eq("service_id", appointment.service_id)
        .eq("is_active", true)
        .maybeSingle();
      flow = data;
    }

    // Fallback to category-level flow
    if (!flow && appointment.service_category) {
      const { data } = await supabase
        .from("service_email_flows")
        .select("id, is_active")
        .eq("organization_id", appointment.organization_id)
        .eq("service_category", appointment.service_category)
        .is("service_id", null)
        .eq("is_active", true)
        .maybeSingle();
      flow = data;
    }

    if (!flow) {
      console.log(`[enqueue] No active flow found for appointment ${appointmentId}`);
      return new Response(
        JSON.stringify({ success: true, action: "no_flow", queued: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active steps for this flow
    const { data: steps, error: stepsError } = await supabase
      .from("service_email_flow_steps")
      .select("id, timing_type, timing_value, step_order")
      .eq("flow_id", flow.id)
      .eq("is_active", true)
      .order("step_order");

    if (stepsError || !steps || steps.length === 0) {
      console.log(`[enqueue] No active steps for flow ${flow.id}`);
      return new Response(
        JSON.stringify({ success: true, action: "no_steps", queued: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate scheduled_at for each step relative to appointment datetime
    // Use org timezone to correctly interpret the appointment date/time
    const orgTimezone = (appointment as any).organizations?.timezone || "America/New_York";
    // Build a timezone-aware datetime string
    const appointmentDatetime = new Date(
      new Date(`${appointment.appointment_date}T${appointment.start_time}`).toLocaleString("en-US", { timeZone: orgTimezone })
    );
    
    // Remove any existing pending queue items for this appointment (idempotent)
    await supabase
      .from("service_email_queue")
      .update({ status: "cancelled" })
      .eq("appointment_id", appointmentId)
      .eq("status", "pending");

    const queueItems = steps.map((step: any) => {
      const offsetMs = step.timing_value * 60 * 60 * 1000; // hours to ms
      let scheduledAt: Date;

      if (step.timing_type === "before_appointment") {
        scheduledAt = new Date(appointmentDatetime.getTime() - offsetMs);
      } else {
        scheduledAt = new Date(appointmentDatetime.getTime() + offsetMs);
      }

      // Don't queue steps that are already in the past
      if (scheduledAt.getTime() < Date.now()) {
        console.log(`[enqueue] Skipping step ${step.id} - scheduled_at is in the past`);
        return null;
      }

      return {
        organization_id: appointment.organization_id,
        appointment_id: appointmentId,
        client_id: appointment.client_id,
        step_id: step.id,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
      };
    }).filter(Boolean);

    if (queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, action: "all_past", queued: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await supabase
      .from("service_email_queue")
      .insert(queueItems);

    if (insertError) {
      throw new Error(`Failed to insert queue items: ${insertError.message}`);
    }

    console.log(`[enqueue] Queued ${queueItems.length} emails for appointment ${appointmentId}`);

    return new Response(
      JSON.stringify({ success: true, action: "queued", queued: queueItems.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[enqueue] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
