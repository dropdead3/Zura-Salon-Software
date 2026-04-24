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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the JWT using anon client with user's token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    }) as any;

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: verify caller is an org admin or platform user
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: userId,
      _org_id: organization_id,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to verify this domain" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the domain record
    const { data: domainRecord, error: fetchError } = await supabase
      .from("organization_domains")
      .select("*")
      .eq("organization_id", organization_id)
      .single();

    if (fetchError || !domainRecord) {
      return new Response(
        JSON.stringify({ error: "No domain configured for this organization" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set status to verifying
    await supabase
      .from("organization_domains")
      .update({ status: "verifying" })
      .eq("id", domainRecord.id);

    // Query Google DNS API for TXT records
    const txtName = `_lovable.${domainRecord.domain}`;
    const dnsUrl = `https://dns.google/resolve?name=${encodeURIComponent(txtName)}&type=TXT`;

    let verified = false;
    try {
      const dnsResponse = await fetch(dnsUrl);
      const dnsData = await dnsResponse.json();

      if (dnsData.Answer && Array.isArray(dnsData.Answer)) {
        for (const answer of dnsData.Answer) {
          const txtValue = (answer.data || "").replace(/"/g, "").trim();
          if (txtValue.includes(domainRecord.verification_token)) {
            verified = true;
            break;
          }
        }
      }
    } catch (dnsError) {
      console.error("DNS lookup failed:", dnsError);
    }

    // Update status based on result
    const newStatus = verified ? "active" : "pending";
    const updateData: Record<string, unknown> = { status: newStatus };
    if (verified) {
      updateData.verified_at = new Date().toISOString();
    }

    await supabase
      .from("organization_domains")
      .update(updateData)
      .eq("id", domainRecord.id);

    return new Response(
      JSON.stringify({
        status: newStatus,
        message: verified
          ? "Domain verified successfully! DNS records confirmed."
          : "Verification token not found in DNS. Make sure you've added the TXT record and wait for DNS propagation (can take up to 72 hours).",
      }),
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
