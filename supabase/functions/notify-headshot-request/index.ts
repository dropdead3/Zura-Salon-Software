import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeadshotRequestNotification {
  requester_name: string;
  requester_email: string;
  requested_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { requester_name, requester_email, requested_at }: HeadshotRequestNotification = await req.json();

    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin");

    if (rolesError) throw new Error("Failed to fetch admin users");
    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ message: "No admins to notify" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminUserIds = adminRoles.map((r: any) => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("employee_profiles")
      .select("email, display_name, full_name, organization_id")
      .in("user_id", adminUserIds)
      .not("email", "is", null);

    if (profilesError) throw new Error("Failed to fetch admin profiles");
    if (!adminProfiles?.length) {
      return new Response(JSON.stringify({ message: "No admin emails found" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminEmails = adminProfiles.map((p: any) => p.email).filter(Boolean) as string[];
    const organizationId = adminProfiles[0]?.organization_id;
    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace(".supabase.co", ".lovable.app")}`;

    const formattedDate = new Date(requested_at).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    });

    const emailHtml = `
      <h1 style="text-align: center; font-size: 24px; letter-spacing: 2px;">NEW HEADSHOT REQUEST</h1>
      <p>A team member has requested a professional headshot session.</p>
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px;"><strong>Name:</strong> ${requester_name}</p>
        <p style="margin: 0 0 12px;"><strong>Email:</strong> ${requester_email}</p>
        <p style="margin: 0;"><strong>Requested:</strong> ${formattedDate}</p>
      </div>
      <p>Please schedule their headshot session at your earliest convenience.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${siteUrl}/dashboard/admin/headshot-requests" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 600;">
          VIEW REQUEST
        </a>
      </div>
    `;

    if (organizationId) {
      await sendOrgEmail(supabase, organizationId, {
        to: adminEmails,
        subject: `📸 New Headshot Request from ${requester_name}`,
        html: emailHtml,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in notify-headshot-request:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
