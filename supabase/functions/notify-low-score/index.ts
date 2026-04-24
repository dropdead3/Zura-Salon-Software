import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  token: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { token }: NotifyRequest = await req.json();

    if (!token) {
      throw new Error("Missing feedback token");
    }

    // Get the feedback response
    const { data: feedback, error: feedbackError } = await supabase
      .from("client_feedback_responses")
      .select(`
        *,
        client:phorest_clients(first_name, last_name, email, mobile),
        organization:organizations(id, name)
      `)
      .eq("token", token)
      .single();

    if (feedbackError || !feedback) {
      throw new Error("Feedback not found");
    }

    // Check if already notified
    if (feedback.manager_notified) {
      return new Response(
        JSON.stringify({ message: "Already notified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get managers/admins to notify
    const { data: managers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager", "super_admin"]);

    if (!managers || managers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No managers to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get manager emails
    const managerIds = managers.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from("employee_profiles")
      .select("email")
      .in("user_id", managerIds)
      .not("email", "is", null);

    const managerEmails = profiles?.map((p: any) => p.email).filter(Boolean) || [];

    if (managerEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No manager emails found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientName = feedback.client 
      ? `${feedback.client.first_name || ''} ${feedback.client.last_name || ''}`.trim() || 'Anonymous'
      : 'Anonymous';

    const organizationId = feedback.organization?.id || feedback.organization_id;

    const emailHtml = `
      <h2 style="color: #dc2626;">⚠️ Low Score Feedback Alert</h2>
      <p>A client has submitted feedback that requires attention:</p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Client:</strong> ${clientName}</p>
        <p style="margin: 8px 0 0;"><strong>Overall Rating:</strong> ${'★'.repeat(feedback.overall_rating || 0)}${'☆'.repeat(5 - (feedback.overall_rating || 0))} (${feedback.overall_rating || 'N/A'}/5)</p>
        <p style="margin: 8px 0 0;"><strong>NPS Score:</strong> ${feedback.nps_score ?? 'N/A'}/10</p>
      </div>
      ${feedback.comments ? `
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${feedback.comments}"</p>
        </div>
      ` : ''}
      <h3>Rating Breakdown</h3>
      <ul>
        <li>Service Quality: ${feedback.service_quality || 'N/A'}/5</li>
        <li>Staff Friendliness: ${feedback.staff_friendliness || 'N/A'}/5</li>
        <li>Cleanliness: ${feedback.cleanliness || 'N/A'}/5</li>
        <li>Would Return: ${feedback.would_recommend === true ? 'Yes' : feedback.would_recommend === false ? 'No' : 'N/A'}</li>
      </ul>
      ${feedback.client?.email || feedback.client?.mobile ? `
        <h3>Contact Information</h3>
        <p>
          ${feedback.client?.email ? `Email: ${feedback.client.email}<br>` : ''}
          ${feedback.client?.mobile ? `Phone: ${feedback.client.mobile}` : ''}
        </p>
      ` : ''}
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This is an automated alert from your feedback system.
      </p>
    `;

    await sendOrgEmail(supabase, organizationId, {
      to: managerEmails,
      subject: `⚠️ Low Score Alert: ${clientName} rated ${feedback.overall_rating || 'N/A'}/5`,
      html: emailHtml,
    });

    // Mark as notified
    await supabase
      .from("client_feedback_responses")
      .update({
        manager_notified: true,
        manager_notified_at: new Date().toISOString(),
      })
      .eq("token", token);

    return new Response(
      JSON.stringify({ success: true, emailsSent: managerEmails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in notify-low-score:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
