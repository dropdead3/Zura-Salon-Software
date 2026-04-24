import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Authenticate
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

    const { mergeLogId } = await req.json();
    if (!mergeLogId) {
      return new Response(
        JSON.stringify({ error: "Missing mergeLogId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the merge log
    const { data: mergeLog, error: logError } = await supabase
      .from("client_merge_log")
      .select("*")
      .eq("id", mergeLogId)
      .single();

    if (logError || !mergeLog) {
      return new Response(
        JSON.stringify({ error: "Merge log not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check undo window
    if (mergeLog.is_undone) {
      return new Response(
        JSON.stringify({ error: "This merge has already been undone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(mergeLog.undo_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Undo window has expired (7 days)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { primary_client_id, secondary_client_ids, before_snapshots } = mergeLog;

    // 1. Restore secondary clients from snapshots
    for (const secId of secondary_client_ids) {
      const snapshot = before_snapshots[secId];
      if (snapshot) {
        // Restore key identity fields + status
        await supabase
          .from("clients")
          .update({
            first_name: snapshot.first_name,
            last_name: snapshot.last_name,
            email: snapshot.email,
            mobile: snapshot.mobile,
            phone: snapshot.phone,
            notes: snapshot.notes,
            is_vip: snapshot.is_vip,
            preferred_stylist_id: snapshot.preferred_stylist_id,
            location_id: snapshot.location_id,
            status: "active",
            merged_into_client_id: null,
            merged_at: null,
            merged_by: null,
            is_active: true,
          })
          .eq("id", secId);
      }
    }

    // 2. Re-parent records back to their original clients
    // We reverse the reparenting by moving records that were merged
    // from secondary IDs back. Since we updated client_id from secondary→primary,
    // we can only reverse records that existed at merge time.
    // For safety, we just restore the secondary clients and mark log as undone.
    // Records stay with primary (conservative approach - no data loss).

    // 3. Mark merge log as undone
    await supabase
      .from("client_merge_log")
      .update({
        is_undone: true,
        undone_at: new Date().toISOString(),
        undone_by: user.id,
      })
      .eq("id", mergeLogId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Merge undone. Secondary client profiles restored. Historical records remain with primary client.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Undo merge error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
