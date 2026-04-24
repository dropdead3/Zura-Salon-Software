import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { PLATFORM_NAME, PLATFORM_URL } from "../_shared/brand.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.user.id;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "manager"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org id
    const { data: profile } = await supabase
      .from("employee_profiles")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipient_email } = await req.json();
    if (!recipient_email) {
      return new Response(JSON.stringify({ error: "recipient_email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sample content for branding test
    const sampleHtml = `
      <p style="font-size: 16px; color: #18181b; margin: 0 0 16px;">Hi there 👋</p>
      <p style="font-size: 14px; color: #3f3f46; line-height: 1.6; margin: 0 0 16px;">
        This is a <strong>branding test email</strong> from your organization. If you're seeing this,
        your email branding is configured correctly — the header, accent color, sender name, and footer
        are all working as expected.
      </p>
      <p style="font-size: 14px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px;">
        This is exactly how your team and clients will see emails sent through ${PLATFORM_NAME}.
      </p>
      <div style="text-align: center;">
        <a href="${PLATFORM_URL}" style="display: inline-block; background-color: #6366F1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Visit Dashboard
        </a>
      </div>
    `;

    const result = await sendOrgEmail(supabase, profile.organization_id, {
      to: [recipient_email],
      subject: "[BRANDING TEST] Email Branding Preview",
      html: sampleHtml,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-branding-test-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
