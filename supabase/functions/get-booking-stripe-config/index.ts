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
    const { organization_id } = await req.json();

    if (!organization_id || typeof organization_id !== "string") {
      return jsonResponse({ error: "organization_id is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    ) as any;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .maybeSingle();

    if (error) throw error;
    if (!org?.stripe_connect_account_id) {
      return jsonResponse({ error: "Payment processing is not configured for this business" }, 400);
    }

    const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
    if (!publishableKey) {
      return jsonResponse({ error: "Payment configuration incomplete" }, 500);
    }

    return jsonResponse({
      publishable_key: publishableKey,
      connected_account_id: org.stripe_connect_account_id,
    });
  } catch (error) {
    console.error("get-booking-stripe-config error:", error);
    return jsonResponse({ error: error.message || "An unexpected error occurred" }, 500);
  }
});
