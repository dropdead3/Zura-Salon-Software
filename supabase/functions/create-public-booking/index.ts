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
      signed_form_template_ids, // Wave 7: optional list of form templates the client signed inline at confirm
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

    const signedFormIds: string[] = Array.isArray(signed_form_template_ids)
      ? signed_form_template_ids.filter((id) => typeof id === "string")
      : [];

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

    // ── Look up service (with online overrides + Wave 2 guardrails) ──
    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select(
        "id, name, category, duration_minutes, price, requires_deposit, deposit_type, deposit_amount, require_card_on_file, online_duration_override, online_discount_pct, patch_test_required, patch_test_validity_days, start_up_minutes, shut_down_minutes"
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
    // Internal scheduling always uses real duration_minutes (online_duration_override is display-only)
    const durationMinutes = service.duration_minutes || 60;
    const [h, m] = time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + durationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // ── Wave 2: Operational guardrails ─────────────────────────
    // Start-up / shut-down windows protect chemical & long services from booking
    // in the first/last N minutes of the operating day.
    const startUpMin = Number(service.start_up_minutes ?? 0);
    const shutDownMin = Number(service.shut_down_minutes ?? 0);

    if (startUpMin > 0 || shutDownMin > 0) {
      // Resolve operating hours for the date — fall back to 09:00–20:00 if not configured.
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayKey = dayNames[new Date(`${date}T12:00:00Z`).getUTCDay()];
      let openMin = 9 * 60;
      let closeMin = 20 * 60;

      if (location_id) {
        const { data: loc } = await supabase
          .from("locations")
          .select("hours_json")
          .eq("id", location_id)
          .maybeSingle();
        const dayHours = (loc?.hours_json as Record<string, { open?: string; close?: string; closed?: boolean }> | null)?.[dayKey];
        if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
          const [oh, om] = dayHours.open.split(":").map(Number);
          const [ch, cm] = dayHours.close.split(":").map(Number);
          openMin = oh * 60 + (om || 0);
          closeMin = ch * 60 + (cm || 0);
        }
      }

      if (startMinutes < openMin + startUpMin) {
        return jsonResponse(
          {
            error: `This service can't be booked in the first ${startUpMin} minutes of the day.`,
            code: "START_UP_WINDOW",
          },
          422
        );
      }
      if (endMinutes > closeMin - shutDownMin) {
        return jsonResponse(
          {
            error: `This service can't be booked in the final ${shutDownMin} minutes of the day.`,
            code: "SHUT_DOWN_WINDOW",
          },
          422
        );
      }
    }

    // Patch test gate — block if required and no valid test on file.
    if (service.patch_test_required) {
      const validityDays = Number(service.patch_test_validity_days ?? 180);
      const cutoff = new Date(Date.now() - validityDays * 86400_000).toISOString();
      const { data: tests } = await supabase
        .from("client_patch_tests")
        .select("id, performed_at, result")
        .eq("organization_id", organization_id)
        .eq("client_id", clientId)
        .eq("result", "pass")
        .gte("performed_at", cutoff)
        .order("performed_at", { ascending: false })
        .limit(1);

      if (!tests || tests.length === 0) {
        return jsonResponse(
          {
            error: "A valid patch test is required before booking this service. Please contact the salon to schedule one.",
            code: "PATCH_TEST_REQUIRED",
            patch_test_validity_days: validityDays,
          },
          422
        );
      }
    }

    // ── Wave 7: Resolve required forms for this service ─────────
    // Used to (a) decide forms_required flag, (b) validate signed_form_template_ids
    // claims against the actual server-side requirements.
    const { data: requirements } = await supabase
      .from("service_form_requirements")
      .select("form_template_id, is_required, signing_frequency, form_templates!inner(id, version, organization_id)")
      .eq("service_id", service.id)
      .eq("is_required", true);

    const requiredFormIds = new Set(
      (requirements ?? [])
        .filter((r: any) => r.form_templates?.organization_id === organization_id)
        .map((r: any) => r.form_template_id as string)
    );
    const formsRequired = requiredFormIds.size > 0;

    // Filter the client-claimed signed list to only those that actually match the requirements
    const validSignedIds = signedFormIds.filter((id) => requiredFormIds.has(id));
    const allRequiredSigned =
      formsRequired && validSignedIds.length === requiredFormIds.size;
    const formsCompleted = !formsRequired || allRequiredSigned;

    // ── Apply online discount if configured ─────────────────────
    const basePrice = service.price != null ? Number(service.price) : null;
    const discountPct = service.online_discount_pct != null
      ? Number(service.online_discount_pct)
      : 0;
    const finalPrice = basePrice != null && discountPct > 0
      ? +(basePrice * (1 - discountPct / 100)).toFixed(2)
      : basePrice;

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
        total_price: finalPrice,
        original_price: null,
        status: "pending",
        import_source: "online_booking",
        deposit_required: requiresDeposit,
        deposit_amount: requiresDeposit ? service.deposit_amount : null,
        deposit_status: requiresDeposit ? "pending" : null,
        card_on_file_id: null,
        // Wave 7: form gating flags
        forms_required: formsRequired,
        forms_completed: formsCompleted,
        forms_completed_at: formsCompleted && formsRequired ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (apptErr) throw apptErr;

    // ── Wave 7: Record signatures server-side ───────────────────
    // We trust the form_template_id only after validating against required set above.
    if (validSignedIds.length > 0) {
      // Look up each template's current version to stamp the signature row.
      const { data: tmplRows } = await supabase
        .from("form_templates")
        .select("id, version")
        .in("id", validSignedIds);

      const versionMap = new Map<string, string>(
        (tmplRows ?? []).map((t: any) => [t.id as string, t.version as string])
      );

      const sigRows = validSignedIds.map((tplId) => ({
        client_id: clientId,
        form_template_id: tplId,
        form_version: versionMap.get(tplId) ?? "1",
        typed_signature: `${firstName} ${lastName}`.trim(),
        appointment_id: appointment.id,
        collected_by: null, // self-signed via public booking
      }));

      const { error: sigErr } = await supabase
        .from("client_form_signatures")
        .insert(sigRows);

      if (sigErr) {
        // Don't fail the booking — log and continue. Forms can be re-collected at check-in.
        console.error("Failed to record signatures (booking still created):", sigErr);
      }
    }

    return jsonResponse({
      success: true,
      appointment_id: appointment.id,
      requires_deposit: requiresDeposit,
      requires_card_on_file: requireCardOnFile,
      deposit_amount: requiresDeposit ? service.deposit_amount : null,
      forms_required: formsRequired,
      forms_completed: formsCompleted,
    });
  } catch (error) {
    console.error("create-public-booking error:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
