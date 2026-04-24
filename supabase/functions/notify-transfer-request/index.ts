import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const { transferId, organizationId, toLocationId, fromLocationName, toLocationName } = await req.json();

    if (!transferId || !organizationId || !toLocationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up staff at destination location with manager-level roles
    const { data: locationStaff } = await supabase
      .from("employee_profiles")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("primary_location_id", toLocationId)
      .in("role", ["owner", "manager", "admin"]);

    const recipients = locationStaff || [];
    const results = [];

    for (const staff of recipients) {
      const result = await createNotification(supabase, {
        type: "transfer_request",
        severity: "info",
        title: `Incoming Transfer to ${toLocationName || "your location"}`,
        message: `A stock transfer has been created from ${fromLocationName || "another location"} to ${toLocationName || "your location"}. Please review and complete it when inventory arrives.`,
        metadata: {
          organization_id: organizationId,
          transfer_id: transferId,
          to_location_id: toLocationId,
          recipient_id: staff.user_id,
        },
      });
      results.push(result);
    }

    return new Response(
      JSON.stringify({ success: true, notified: results.filter(r => r.inserted).length, total: recipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
