import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { PLATFORM_URL } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  template_id: string;
  recipient_email: string;
}

const sampleVariables: Record<string, string> = {
  birthday_date: "Friday, January 24",
  birthday_count: "2",
  birthday_list: '<li style="margin-bottom: 8px;">🎂 <strong>Jane Smith</strong></li><li style="margin-bottom: 8px;">🎂 <strong>John Doe</strong></li>',
  birthday_names: "Jane Smith, John Doe",
  days_until: "3",
  employee_name: "Test Employee",
  handbook_count: "2",
  handbook_list: '<li style="margin-bottom: 8px;">Employee Handbook v2.0</li><li style="margin-bottom: 8px;">Safety Guidelines</li>',
  handbook_names: "Employee Handbook v2.0, Safety Guidelines",
  dashboard_url: `${PLATFORM_URL}/dashboard`,
  stylist_name: "Test Stylist",
  current_day: "42",
  is_urgent: "false",
  user_name: "New Team Member",
  login_url: `${PLATFORM_URL}/staff-login`,
  staff_name: "Staff Member",
  strike_type: "Late Arrival",
  strike_severity: "Warning",
  strike_title: "Arrived 30 minutes late",
  incident_date: "January 19, 2026",
  org_name: "Sample Salon Group",
  reweigh_pct: "42",
  waste_pct: "8.3",
  session_count: "156",
  reason: "Low reweigh compliance (<50%)",
};

function replaceTemplateVariables(template: string): string {
  let result = template;
  for (const [key, value] of Object.entries(sampleVariables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  result = result.replace(/{{(\w+)}}/g, '[Sample $1]');
  return result;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Only admins can send test emails' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { template_id, recipient_email }: TestEmailRequest = await req.json();
    if (!template_id || !recipient_email) {
      return new Response(JSON.stringify({ error: 'Missing template_id or recipient_email' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("employee_profiles")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .single();

    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const emailSubject = `[TEST] ${replaceTemplateVariables(template.subject)}`;
    const emailHtml = `
      <div style="background: #fef3c7; padding: 12px; margin-bottom: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <strong>⚠️ TEST EMAIL</strong><br>
        <span style="font-size: 14px; color: #92400e;">This is a test email with sample data. Template: ${template.name}</span>
      </div>
      ${replaceTemplateVariables(template.html_body)}
    `;

    if (profile?.organization_id) {
      await sendOrgEmail(supabase, profile.organization_id, {
        to: [recipient_email],
        subject: emailSubject,
        html: emailHtml,
      });
    } else {
      const { sendEmail } = await import("../_shared/email-sender.ts");
      await sendEmail({ to: [recipient_email], subject: emailSubject, html: emailHtml });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent to ${recipient_email}`, template_name: template.name }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-test-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
