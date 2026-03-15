import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date().toISOString();
    const results = { expired: 0, converted: 0, suspended: 0, warnings: 0, errors: [] as string[] };

    // 1. Find expired trials
    const { data: expired, error: expErr } = await supabase
      .from("backroom_location_entitlements")
      .select("id, organization_id, location_id, stripe_subscription_id, trial_end_date, plan_tier")
      .eq("status", "trial")
      .lt("trial_end_date", now);

    if (expErr) throw expErr;

    for (const ent of expired || []) {
      results.expired++;
      try {
        if (ent.stripe_subscription_id) {
          // Has payment → convert to active
          await supabase
            .from("backroom_location_entitlements")
            .update({ status: "active", updated_at: now })
            .eq("id", ent.id);
          results.converted++;

          // Notify
          await supabase.from("platform_notifications").insert({
            type: "backroom_trial_converted",
            title: "Backroom trial converted",
            message: `Location trial for org ${ent.organization_id} converted to active subscription.`,
            severity: "info",
            metadata: { organization_id: ent.organization_id, location_id: ent.location_id },
          });
        } else {
          // No payment → suspend
          await supabase
            .from("backroom_location_entitlements")
            .update({ status: "suspended", updated_at: now })
            .eq("id", ent.id);
          results.suspended++;

          await supabase.from("platform_notifications").insert({
            type: "backroom_trial_expired",
            title: "Backroom trial expired",
            message: `Location trial for org ${ent.organization_id} suspended — no payment method.`,
            severity: "warning",
            metadata: { organization_id: ent.organization_id, location_id: ent.location_id },
          });
        }
      } catch (err) {
        results.errors.push(`Failed to process entitlement ${ent.id}: ${err.message}`);
      }
    }

    // 2. Send warning notifications for trials expiring in 7, 3, or 1 days
    const warningDays = [7, 3, 1];
    for (const days of warningDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: expiring } = await supabase
        .from("backroom_location_entitlements")
        .select("id, organization_id, location_id, trial_end_date")
        .eq("status", "trial")
        .gte("trial_end_date", dayStart.toISOString())
        .lte("trial_end_date", dayEnd.toISOString());

      for (const ent of expiring || []) {
        results.warnings++;
        await supabase.from("platform_notifications").insert({
          type: "backroom_trial_warning",
          title: `Backroom trial expiring in ${days} day${days > 1 ? "s" : ""}`,
          message: `Location trial for org ${ent.organization_id} expires on ${ent.trial_end_date}.`,
          severity: days <= 1 ? "critical" : "warning",
          metadata: {
            organization_id: ent.organization_id,
            location_id: ent.location_id,
            days_remaining: days,
          },
        });
      }
    }

    // 3. Log to edge_function_logs
    await supabase.from("edge_function_logs").insert({
      function_name: "backroom-trial-expiration",
      status: results.errors.length > 0 ? "partial_failure" : "success",
      execution_time_ms: 0,
      details: results,
    });

    console.log("[backroom-trial-expiration] Complete:", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[backroom-trial-expiration] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
