import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { organization_id, distribution_date, location_id } = body;

    if (!organization_id || !distribution_date) {
      return new Response(
        JSON.stringify({ error: "organization_id and distribution_date are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate tips from completed appointments for the given date
    let query = supabase
      .from("phorest_appointments")
      .select("stylist_user_id, tip_amount, payment_method")
      .eq("organization_id", organization_id)
      .eq("appointment_date", distribution_date)
      .in("status", ["completed", "checked_out"])
      .gt("tip_amount", 0)
      .not("stylist_user_id", "is", null);

    if (location_id) {
      query = query.eq("location_id", location_id);
    }

    const { data: appointments, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, distributions_created: 0, message: "No tips found for this date" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by stylist
    const stylistMap = new Map<string, { total: number; cash: number; card: number }>();
    for (const appt of appointments) {
      const sid = appt.stylist_user_id as string;
      const tip = Number(appt.tip_amount) || 0;
      const existing = stylistMap.get(sid) || { total: 0, cash: 0, card: 0 };
      existing.total += tip;
      const method = (appt.payment_method || "").toLowerCase();
      if (method === "cash") {
        existing.cash += tip;
      } else {
        existing.card += tip;
      }
      stylistMap.set(sid, existing);
    }

    // Upsert distributions — skip confirmed/paid rows
    const rows = Array.from(stylistMap.entries()).map(([stylistId, tips]) => ({
      organization_id,
      location_id: location_id || null,
      stylist_user_id: stylistId,
      distribution_date,
      total_tips: tips.total,
      cash_tips: tips.cash,
      card_tips: tips.card,
      method: "cash",
      status: "pending",
    }));

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      // Check if already exists
      let existsQuery = supabase
        .from("tip_distributions")
        .select("id, status")
        .eq("organization_id", row.organization_id)
        .eq("stylist_user_id", row.stylist_user_id)
        .eq("distribution_date", row.distribution_date);

      if (row.location_id) {
        existsQuery = existsQuery.eq("location_id", row.location_id);
      } else {
        existsQuery = existsQuery.is("location_id", null);
      }

      const { data: existing } = await existsQuery.maybeSingle();

      if (existing) {
        // Skip updating confirmed or paid distributions
        if (existing.status === "confirmed" || existing.status === "paid") {
          skipped++;
          continue;
        }
        // Only update pending distributions
        await supabase
          .from("tip_distributions")
          .update({
            total_tips: row.total_tips,
            cash_tips: row.cash_tips,
            card_tips: row.card_tips,
          })
          .eq("id", existing.id);
      } else {
        const { error: insertError } = await supabase
          .from("tip_distributions")
          .insert(row);
        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          created++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        distributions_created: created,
        total_stylists: rows.length,
        skipped_confirmed: skipped,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
