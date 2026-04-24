import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { PLATFORM_URL } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StylistWithIncomplete {
  user_id: string;
  current_day: number;
  email: string;
  full_name: string;
  organization_id: string;
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
    let isLateReminder = false;
    try {
      const body = await req.json();
      isLateReminder = body?.isLateReminder === true;
    } catch { /* default */ }

    console.log(`Starting ${isLateReminder ? 'LATE' : 'regular'} daily reminder check...`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const templateKey = isLateReminder ? "daily_program_reminder_urgent" : "daily_program_reminder";
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates").select("*").eq("template_key", templateKey).eq("is_active", true).single();

    if (templateError || !templateData) {
      throw new Error(`Daily program reminder email template (${templateKey}) not found or inactive`);
    }

    const template = templateData as EmailTemplate;
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("stylist_program_enrollment").select("id, user_id, current_day, status").eq("status", "active");

    if (enrollmentError) throw enrollmentError;

    const stylistsToRemind: StylistWithIncomplete[] = [];

    for (const enrollment of enrollments || []) {
      const { data: completion } = await supabase
        .from("daily_completions").select("is_complete").eq("enrollment_id", enrollment.id).eq("day_number", enrollment.current_day).maybeSingle();

      if (!completion?.is_complete) {
        const { data: profile } = await supabase
          .from("employee_profiles").select("email, full_name, organization_id").eq("user_id", enrollment.user_id).single();

        if (profile?.email) {
          stylistsToRemind.push({
            user_id: enrollment.user_id, current_day: enrollment.current_day,
            email: profile.email, full_name: profile.full_name, organization_id: profile.organization_id,
          });
        }
      }
    }

    console.log(`Sending reminders to ${stylistsToRemind.length} stylists`);

    const emailResults = [];
    const siteUrl = Deno.env.get("SITE_URL") || PLATFORM_URL;

    for (const stylist of stylistsToRemind) {
      try {
        const templateVariables: Record<string, string> = {
          stylist_name: stylist.full_name, current_day: stylist.current_day.toString(),
          dashboard_url: `${siteUrl}/dashboard`, is_urgent: isLateReminder ? "true" : "false",
        };

        const emailSubject = replaceTemplateVariables(template.subject, templateVariables);
        const emailHtml = replaceTemplateVariables(template.html_body, templateVariables);

        const result = await sendOrgEmail(supabase, stylist.organization_id, {
          to: [stylist.email], subject: emailSubject, html: emailHtml,
        });

        console.log(`Email sent to ${stylist.email}:`, result);
        emailResults.push({ email: stylist.email, success: result.success, result });
      } catch (emailError) {
        console.error(`Failed to send email to ${stylist.email}:`, emailError);
        emailResults.push({ email: stylist.email, success: false, error: String(emailError) });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily reminders processed", totalChecked: enrollments?.length || 0,
        remindersNeeded: stylistsToRemind.length, template_used: template.name, results: emailResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-daily-reminders:", error);
    return new Response(JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
