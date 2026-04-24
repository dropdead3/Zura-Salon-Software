import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InactiveParticipant {
  user_id: string;
  full_name: string;
  display_name: string | null;
  current_day: number;
  streak_count: number;
  last_completion_date: string | null;
  days_inactive: number;
  organization_id: string | null;
}

interface LeadershipUser {
  user_id: string;
  email: string;
  full_name: string;
  organization_id: string | null;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_body: string;
  variables: string[] | null;
  is_active: boolean;
}

// Replace template variables with actual values
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting inactivity alert check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Configurable inactivity threshold (default 3 days)
    let inactivityThreshold = 3;
    try {
      const body = await req.json();
      if (body?.threshold && typeof body.threshold === 'number') {
        inactivityThreshold = body.threshold;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    console.log(`Checking for participants inactive for ${inactivityThreshold}+ days...`);

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - inactivityThreshold);
    const thresholdDateStr = thresholdDate.toISOString().split("T")[0];

    const { data: enrollments, error: enrollmentError } = await supabase
      .from("stylist_program_enrollment")
      .select(`
        id,
        user_id,
        current_day,
        streak_count,
        last_completion_date,
        status
      `)
      .eq("status", "active")
      .or(`last_completion_date.is.null,last_completion_date.lt.${thresholdDateStr}`);

    if (enrollmentError) {
      console.error("Error fetching enrollments:", enrollmentError);
      throw enrollmentError;
    }

    console.log(`Found ${enrollments?.length || 0} potentially inactive enrollments`);

    const inactiveParticipants: InactiveParticipant[] = [];
    
    for (const enrollment of enrollments || []) {
      const { data: profile } = await supabase
        .from("employee_profiles")
        .select("full_name, display_name, organization_id")
        .eq("user_id", enrollment.user_id)
        .single();

      if (profile) {
        let daysInactive = inactivityThreshold;
        if (enrollment.last_completion_date) {
          const lastDate = new Date(enrollment.last_completion_date);
          const today = new Date();
          daysInactive = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (daysInactive >= inactivityThreshold) {
          inactiveParticipants.push({
            user_id: enrollment.user_id,
            full_name: profile.full_name,
            display_name: profile.display_name,
            current_day: enrollment.current_day,
            streak_count: enrollment.streak_count,
            last_completion_date: enrollment.last_completion_date,
            days_inactive: daysInactive,
            organization_id: profile.organization_id,
          });
        }
      }
    }

    console.log(`${inactiveParticipants.length} participants are inactive for ${inactivityThreshold}+ days`);

    if (inactiveParticipants.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No inactive participants found",
          threshold_days: inactivityThreshold,
          inactive_count: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get leadership users (admins and managers)
    const { data: leadershipRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    if (rolesError) {
      console.error("Error fetching leadership roles:", rolesError);
      throw rolesError;
    }

    const leadershipUserIds = [...new Set(leadershipRoles?.map(r => r.user_id) || [])];

    const leadershipUsers: LeadershipUser[] = [];
    for (const userId of leadershipUserIds) {
      const { data: profile } = await supabase
        .from("employee_profiles")
        .select("user_id, email, full_name, organization_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (profile?.email) {
        leadershipUsers.push({
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          organization_id: profile.organization_id,
        });
      }
    }

    console.log(`${leadershipUsers.length} leadership users have email addresses`);

    // Fetch email template
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", "client_engine_inactivity_alert")
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      console.error("Error fetching email template:", templateError);
      throw new Error("Client Engine inactivity alert email template not found or inactive");
    }

    const template = templateData as EmailTemplate;
    console.log(`Using email template: ${template.name}`);

    // Build participant list HTML
    const participantListHtml = inactiveParticipants
      .sort((a: any, b: any) => b.days_inactive - a.days_inactive)
      .map(p => `
        <tr style="border-bottom: 1px solid #e5e5e5;">
          <td style="padding: 12px; font-weight: 500;">${p.display_name || p.full_name}</td>
          <td style="padding: 12px; text-align: center;">${p.current_day}/75</td>
          <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: 600;">${p.days_inactive} days</td>
          <td style="padding: 12px; text-align: center;">${p.last_completion_date || 'Never'}</td>
        </tr>
      `)
      .join('');

    const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace('.supabase.co', '.lovable.app');
    const emailResults = [];

    for (const leader of leadershipUsers) {
      try {
        const templateVariables: Record<string, string> = {
          leader_name: leader.full_name,
          inactive_count: inactiveParticipants.length.toString(),
          threshold_days: inactivityThreshold.toString(),
          participant_list: participantListHtml,
          tracker_url: `${siteUrl}/dashboard/admin/client-engine-tracker`,
          dashboard_url: `${siteUrl}/dashboard`,
        };

        const emailSubject = replaceTemplateVariables(template.subject, templateVariables);
        const emailHtml = replaceTemplateVariables(template.html_body, templateVariables);

        // Use sendOrgEmail if we have an org context, otherwise fall back
        const orgId = leader.organization_id;
        let result;
        if (orgId) {
          result = await sendOrgEmail(supabase, orgId, {
            to: [leader.email],
            subject: emailSubject,
            html: emailHtml,
          });
        } else {
          // Fallback: import sendEmail for platform-level
          const { sendEmail } = await import("../_shared/email-sender.ts");
          result = await sendEmail({
            to: [leader.email],
            subject: emailSubject,
            html: emailHtml,
          });
        }

        console.log(`Email sent to ${leader.email}:`, result);
        emailResults.push({ email: leader.email, success: result.success, result });
      } catch (emailError) {
        console.error(`Failed to send email to ${leader.email}:`, emailError);
        emailResults.push({ email: leader.email, success: false, error: String(emailError) });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Inactivity alerts processed",
        threshold_days: inactivityThreshold,
        inactive_count: inactiveParticipants.length,
        leadership_notified: leadershipUsers.length,
        inactive_participants: inactiveParticipants.map(p => ({
          name: p.display_name || p.full_name,
          days_inactive: p.days_inactive,
          current_day: p.current_day,
        })),
        email_results: emailResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-inactivity-alerts:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
