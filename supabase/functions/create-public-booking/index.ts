import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // ── Input validation ────────────────────────────────────────
    const {
      organization_id,
      service_name,
      stylist_id,
      location_id,
      date,
      time,
      client,
    } = body;

    if (!organization_id || typeof organization_id !== "string") {
      return jsonResponse({ error: "organization_id is required" }, 400);
    }
    if (!service_name || typeof service_name !== "string") {
      return jsonResponse({ error: "service_name is required" }, 400);
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonResponse({ error: "date must be YYYY-MM-DD" }, 400);
    }
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return jsonResponse({ error: "time must be HH:MM" }, 400);
    }
    if (
      !client ||
      !client.first_name?.trim() ||
      !client.email?.trim()
    ) {
      return jsonResponse(
        { error: "client.first_name and client.email are required" },
        400
      );
    }

    const email = client.email.trim().toLowerCase();
    const firstName = client.first_name.trim();
    const lastName = (client.last_name || "").trim();
    const phone = (client.phone || "").trim();
    const notes = (client.notes || "").trim();

    // ── Rate limiting: max 5 bookings per email per org per hour ─
    const { count: recentCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .eq("client_email", email)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());

    if ((recentCount ?? 0) >= 5) {
      return jsonResponse(
        { error: "Too many booking requests. Please try again later." },
        429
      );
    }

    // ── Look up service ─────────────────────────────────────────
    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select(
        "id, name, category, duration_minutes, price, requires_deposit, deposit_type, deposit_amount, require_card_on_file"
      )
      .eq("organization_id", organization_id)
      .eq("name", service_name)
      .eq("is_active", true)
      .eq("bookable_online", true)
      .maybeSingle();

    if (svcErr) throw svcErr;
    if (!service) {
      return jsonResponse({ error: "Service not found or not bookable" }, 404);
    }

    // ── Client upsert ───────────────────────────────────────────
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("email", email)
      .maybeSingle();

    let clientId: string;

    if (existingClient) {
      clientId = existingClient.id;
      // Update name/phone if provided
      await supabase
        .from("clients")
        .update({
          first_name: firstName,
          last_name: lastName || undefined,
          mobile_phone: phone || undefined,
        })
        .eq("id", clientId);
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          organization_id,
          first_name: firstName,
          last_name: lastName || null,
          email,
          mobile_phone: phone || null,
          source: "online_booking",
        })
        .select("id")
        .single();

      if (clientErr) throw clientErr;
      clientId = newClient.id;
    }

    // ── Resolve stylist name ────────────────────────────────────
    let staffName: string | null = null;
    let staffUserId: string | null = null;

    if (stylist_id && stylist_id !== "any") {
      const { data: stylist } = await supabase
        .from("employee_profiles")
        .select("user_id, first_name, last_name")
        .eq("user_id", stylist_id)
        .eq("is_active", true)
        .maybeSingle();

      if (stylist) {
        staffUserId = stylist.user_id;
        staffName = [stylist.first_name, stylist.last_name]
          .filter(Boolean)
          .join(" ");
      }
    }

    // ── Calculate end time ──────────────────────────────────────
    const durationMinutes = service.duration_minutes || 60;
    const [h, m] = time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + durationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // ── Create appointment ──────────────────────────────────────
    const requiresDeposit = service.requires_deposit ?? false;
    const requireCardOnFile = service.require_card_on_file ?? false;

    const { data: appointment, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        organization_id,
        client_id: clientId,
        client_name: [firstName, lastName].filter(Boolean).join(" "),
        client_email: email,
        client_phone: phone || null,
        client_notes: notes || null,
        service_id: service.id,
        service_name: service.name,
        service_category: service.category,
        staff_user_id: staffUserId,
        staff_name: staffName,
        location_id: location_id || null,
        appointment_date: date,
        start_time: `${date}T${time}:00`,
        end_time: `${date}T${endTime}:00`,
        duration_minutes: durationMinutes,
        total_price: service.price,
        original_price: service.price,
        status: "pending",
        import_source: "online_booking",
        deposit_required: requiresDeposit,
        deposit_amount: requiresDeposit ? service.deposit_amount : null,
        deposit_status: requiresDeposit ? "pending" : null,
        card_on_file_id: null,
      })
      .select("id")
      .single();

    if (apptErr) throw apptErr;

    return jsonResponse({
      success: true,
      appointment_id: appointment.id,
      requires_deposit: requiresDeposit,
      requires_card_on_file: requireCardOnFile,
      deposit_amount: requiresDeposit ? service.deposit_amount : null,
    });
  } catch (error) {
    console.error("create-public-booking error:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
