import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { PLATFORM_URL } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeWithPending {
  user_id: string;
  email: string;
  full_name: string;
  pending_handbooks: string[];
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

// Replace template variables with actual values
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting handbook acknowledgment reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Fetch the email template from the database
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", "handbook_reminder")
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      console.error("Error fetching email template:", templateError);
      throw new Error("Handbook reminder email template not found or inactive");
    }

    const template = templateData as EmailTemplate;
    console.log(`Using email template: ${template.name}`);

    // Get all active handbooks
    const { data: handbooks, error: handbooksError } = await supabase
      .from("handbooks")
      .select("id, title, visible_to_roles")
      .eq("is_active", true);

    if (handbooksError) {
      console.error("Error fetching handbooks:", handbooksError);
      throw handbooksError;
    }

    if (!handbooks || handbooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active handbooks found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all employee profiles with their user IDs
    const { data: employees, error: employeesError } = await supabase
      .from("employee_profiles")
      .select("user_id, email, full_name, organization_id")
      .eq("is_active", true);

    if (employeesError) {
      console.error("Error fetching employees:", employeesError);
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active employees found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw rolesError;
    }

    // Get all acknowledgments
    const { data: acknowledgments, error: ackError } = await supabase
      .from("handbook_acknowledgments")
      .select("user_id, handbook_id");

    if (ackError) {
      console.error("Error fetching acknowledgments:", ackError);
      throw ackError;
    }

    const employeesToRemind: EmployeeWithPending[] = [];

    for (const employee of employees) {
      if (!employee.email) continue;

      // Get this user's roles
      const roles = userRoles
        ?.filter((r: any) => r.user_id === employee.user_id)
        .map((r: any) => r.role) || [];

      if (roles.length === 0) continue;

      // Find handbooks visible to this user's roles
      const visibleHandbooks = handbooks.filter((h: any) => {
        const visibleRoles = h.visible_to_roles || [];
        return roles.some((role: any) => visibleRoles.includes(role));
      });

      // Find which handbooks haven't been acknowledged
      const userAcks = acknowledgments
        ?.filter((a: any) => a.user_id === employee.user_id)
        .map((a: any) => a.handbook_id) || [];

      const pendingHandbooks = visibleHandbooks.filter((h: any) => !userAcks.includes(h.id));

      if (pendingHandbooks.length > 0) {
        employeesToRemind.push({
          user_id: employee.user_id,
          email: employee.email,
          full_name: employee.full_name,
          pending_handbooks: pendingHandbooks.map((h: any) => h.title),
          organization_id: employee.organization_id,
        });
      }
    }

    console.log(`Found ${employeesToRemind.length} employees with pending handbooks`);

    const emailResults = [];
    const siteUrl = Deno.env.get("SITE_URL") || PLATFORM_URL;

    for (const employee of employeesToRemind) {
      try {
        const handbookList = employee.pending_handbooks
          .map((title: any) => `<li style="margin-bottom: 8px;">${title}</li>`)
          .join("");

        // Prepare template variables
        const templateVariables: Record<string, string> = {
          employee_name: employee.full_name,
          handbook_count: employee.pending_handbooks.length.toString(),
          handbook_list: handbookList,
          handbook_names: employee.pending_handbooks.join(", "),
          dashboard_url: `${siteUrl}/dashboard/onboarding`,
        };

        // Replace variables in template
        const emailSubject = replaceTemplateVariables(template.subject, templateVariables);
        const emailHtml = replaceTemplateVariables(template.html_body, templateVariables);

        const result = await sendOrgEmail(supabase, employee.organization_id, {
          to: [employee.email],
          subject: emailSubject,
          html: emailHtml,
        });

        emailResults.push({ 
          email: employee.email, 
          success: result.success, 
          pendingCount: employee.pending_handbooks.length 
        });
      } catch (emailError: any) {
        emailResults.push({ 
          email: employee.email, 
          success: false, 
          error: String(emailError) 
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Handbook reminders processed",
        totalEmployees: employees.length,
        employeesWithPending: employeesToRemind.length,
        template_used: template.name,
        results: emailResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-handbook-reminders:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
