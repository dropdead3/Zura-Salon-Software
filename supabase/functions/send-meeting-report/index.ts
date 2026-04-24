import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReportRequest { reportId: string; }

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { reportId }: ReportRequest = await req.json();
    if (!reportId) throw new Error("Report ID is required");

    const { data: report, error: reportError } = await supabase.from("meeting_reports").select("*").eq("id", reportId).single();
    if (reportError || !report) throw new Error("Report not found");

    const { data: teamMember } = await supabase.from("employee_profiles").select("email, full_name, display_name, organization_id").eq("user_id", report.team_member_id).single();
    if (!teamMember?.email) throw new Error("Team member email not found");

    const { data: coach } = await supabase.from("employee_profiles").select("full_name, display_name").eq("user_id", report.coach_id).single();

    const coachName = coach?.display_name || coach?.full_name || "Your Coach";
    const memberName = teamMember.display_name || teamMember.full_name || "Team Member";

    const htmlContent = report.report_content
      .replace(/^# (.*$)/gm, '<h1 style="color: #1a1a1a; margin-bottom: 16px;">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 style="color: #333; margin-top: 24px; margin-bottom: 12px;">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 style="color: #444; margin-top: 16px; margin-bottom: 8px;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li style="margin-left: 20px;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
      .replace(/\n/g, '<br>');

    const emailResult = await sendOrgEmail(supabase, teamMember.organization_id, {
      to: [teamMember.email],
      subject: `Check-in Report from ${coachName}`,
      html: `
        <p style="margin-top: 0;">Hi ${memberName},</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; margin: 16px 0;">
          ${htmlContent}
        </div>
        <p style="color: #666; font-size: 14px;">
          Please review this report and reach out if you have any questions.
        </p>
      `,
    });

    console.log("Report email sent:", emailResult);

    await supabase.from("notifications").insert({
      user_id: report.team_member_id, type: "meeting_report_received",
      title: "New Check-in Report", message: `${coachName} sent you a check-in report.`,
      metadata: { report_id: reportId },
    });

    return new Response(JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending meeting report:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
