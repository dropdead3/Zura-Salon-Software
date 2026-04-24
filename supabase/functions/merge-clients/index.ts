import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MergeRequest {
  primaryClientId: string;
  secondaryClientIds: string[];
  fieldResolutions: Record<string, any>;
  organizationId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: MergeRequest = await req.json();
    const { primaryClientId, secondaryClientIds, fieldResolutions, organizationId } = body;

    if (!primaryClientId || !secondaryClientIds?.length || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check permission via role_permissions
    const { data: hasPermission } = await supabase
      .from("role_permissions")
      .select("id, permissions!inner(name)")
      .eq("permissions.name", "client_merge")
      .in("role", await getUserRoles(supabase, user.id));

    if (!hasPermission?.length) {
      // Check if platform user
      const { data: platformUser } = await supabase
        .from("platform_roles")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!platformUser?.length) {
        return new Response(
          JSON.stringify({ error: "Missing client_merge permission" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 1. Snapshot all clients before merge
    const allClientIds = [primaryClientId, ...secondaryClientIds];
    const { data: clientSnapshots, error: snapError } = await supabase
      .from("clients")
      .select("*")
      .in("id", allClientIds);

    if (snapError || !clientSnapshots?.length) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch client records" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const beforeSnapshots: Record<string, any> = {};
    clientSnapshots.forEach((c: any) => {
      beforeSnapshots[c.id] = c;
    });

    // 2. Apply field resolutions to primary client
    if (Object.keys(fieldResolutions).length > 0) {
      const { error: updateError } = await supabase
        .from("clients")
        .update(fieldResolutions)
        .eq("id", primaryClientId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to apply field resolutions: " + updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Re-parent child records across all tables
    const reparentingCounts: Record<string, number> = {};

    // Tables with client_id UUID column
    const clientIdTables = [
      "appointments",
      "archived_appointments",
      "client_email_preferences",
      "client_feedback_responses",
      "client_form_signatures",
      "client_portal_tokens",
      "client_automation_log",
      "email_send_log",
      "reengagement_outreach",
      "refund_records",
      "promotion_redemptions",
      "kiosk_analytics",
      "service_email_queue",
    ];

    for (const table of clientIdTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .update({ client_id: primaryClientId })
          .in("client_id", secondaryClientIds)
          .select("id");

        if (!error && data) {
          reparentingCounts[table] = data.length;
        }
      } catch {
        // Table may not exist or have client_id column - skip silently
      }
    }

    // Handle balance_transactions (uses phorest_client_id reference as text)
    try {
      const { data, error } = await supabase
        .from("balance_transactions")
        .update({ client_id: primaryClientId })
        .in("client_id", secondaryClientIds)
        .select("id");
      if (!error && data) reparentingCounts["balance_transactions"] = data.length;
    } catch { /* skip */ }

    // Handle client_balances - merge additively
    try {
      const { data: secondaryBalances } = await supabase
        .from("client_balances")
        .select("*")
        .in("client_id", secondaryClientIds);

      if (secondaryBalances?.length) {
        // Get or create primary balance
        const { data: primaryBalance } = await supabase
          .from("client_balances")
          .select("*")
          .eq("client_id", primaryClientId)
          .limit(1);

        let totalSalonCredit = 0;
        let totalGiftCard = 0;

        secondaryBalances.forEach((b: any) => {
          totalSalonCredit += Number(b.salon_credit_balance || 0);
          totalGiftCard += Number(b.gift_card_balance || 0);
        });

        if (primaryBalance?.length) {
          await supabase
            .from("client_balances")
            .update({
              salon_credit_balance: Number(primaryBalance[0].salon_credit_balance || 0) + totalSalonCredit,
              gift_card_balance: Number(primaryBalance[0].gift_card_balance || 0) + totalGiftCard,
            })
            .eq("id", primaryBalance[0].id);
        } else if (totalSalonCredit > 0 || totalGiftCard > 0) {
          await supabase.from("client_balances").insert({
            organization_id: organizationId,
            client_id: primaryClientId,
            salon_credit_balance: totalSalonCredit,
            gift_card_balance: totalGiftCard,
          });
        }

        // Deactivate secondary balances
        await supabase
          .from("client_balances")
          .update({ salon_credit_balance: 0, gift_card_balance: 0 })
          .in("client_id", secondaryClientIds);

        reparentingCounts["client_balances"] = secondaryBalances.length;
      }
    } catch { /* skip */ }

    // Handle client_loyalty_points - merge additively
    try {
      const { data: secondaryPoints } = await supabase
        .from("client_loyalty_points")
        .select("*")
        .in("client_id", secondaryClientIds);

      if (secondaryPoints?.length) {
        const { data: primaryPoints } = await supabase
          .from("client_loyalty_points")
          .select("*")
          .eq("client_id", primaryClientId)
          .limit(1);

        const totalPoints = secondaryPoints.reduce((sum: any, p: any) => sum + Number(p.points_balance || 0),
          0
        );

        if (primaryPoints?.length) {
          await supabase
            .from("client_loyalty_points")
            .update({
              points_balance: Number(primaryPoints[0].points_balance || 0) + totalPoints,
            })
            .eq("id", primaryPoints[0].id);
        }

        // Zero out secondary points
        await supabase
          .from("client_loyalty_points")
          .update({ points_balance: 0 })
          .in("client_id", secondaryClientIds);

        reparentingCounts["client_loyalty_points"] = secondaryPoints.length;
      }
    } catch { /* skip */ }

    // Handle points_transactions
    try {
      const { data, error } = await supabase
        .from("points_transactions")
        .update({ client_id: primaryClientId })
        .in("client_id", secondaryClientIds)
        .select("id");
      if (!error && data) reparentingCounts["points_transactions"] = data.length;
    } catch { /* skip */ }

    // Handle client_notes
    try {
      const { data, error } = await supabase
        .from("client_notes")
        .update({ client_id: primaryClientId })
        .in("client_id", secondaryClientIds)
        .select("id");
      if (!error && data) reparentingCounts["client_notes"] = data.length;
    } catch { /* skip */ }

    // Handle vouchers
    try {
      const { data: v1 } = await supabase
        .from("vouchers")
        .update({ issued_to_client_id: primaryClientId })
        .in("issued_to_client_id", secondaryClientIds)
        .select("id");
      if (v1) reparentingCounts["vouchers_issued"] = v1.length;

      const { data: v2 } = await supabase
        .from("vouchers")
        .update({ redeemed_by_client_id: primaryClientId })
        .in("redeemed_by_client_id", secondaryClientIds)
        .select("id");
      if (v2) reparentingCounts["vouchers_redeemed"] = v2.length;
    } catch { /* skip */ }

    // Handle phorest_appointments via phorest_client_id mapping
    try {
      // Get phorest_client_ids for secondary clients
      const secondaryPhorestIds = clientSnapshots
        .filter((c: any) => secondaryClientIds.includes(c.id) && c.phorest_client_id)
        .map((c: any) => c.phorest_client_id);

      const primaryPhorestId = clientSnapshots.find((c: any) => c.id === primaryClientId
      )?.phorest_client_id;

      if (secondaryPhorestIds.length > 0 && primaryPhorestId) {
        const { data } = await supabase
          .from("phorest_appointments")
          .update({ phorest_client_id: primaryPhorestId })
          .in("phorest_client_id", secondaryPhorestIds)
          .select("id");
        if (data) reparentingCounts["phorest_appointments"] = data.length;
      }
    } catch { /* skip */ }

    // 4. Mark secondary clients as merged
    const { error: mergeError } = await supabase
      .from("clients")
      .update({
        status: "merged",
        merged_into_client_id: primaryClientId,
        merged_at: new Date().toISOString(),
        merged_by: user.id,
        is_active: false,
      })
      .in("id", secondaryClientIds);

    if (mergeError) {
      return new Response(
        JSON.stringify({ error: "Failed to mark secondary clients: " + mergeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create merge log
    const { data: mergeLog, error: logError } = await supabase
      .from("client_merge_log")
      .insert({
        organization_id: organizationId,
        primary_client_id: primaryClientId,
        secondary_client_ids: secondaryClientIds,
        performed_by: user.id,
        field_resolutions: fieldResolutions,
        before_snapshots: beforeSnapshots,
        reparenting_counts: reparentingCounts,
        undo_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select("id")
      .single();

    if (logError) {
      console.error("Failed to create merge log:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mergeLogId: mergeLog?.id,
        reparentingCounts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Merge error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getUserRoles(
  supabase: any,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (data || []).map((r: any) => r.role);
}
