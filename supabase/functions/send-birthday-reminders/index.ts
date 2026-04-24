import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  email: string | null;
  birthday: string | null;
  photo_url: string | null;
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

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    let daysBeforeBirthday = 3;
    try {
      const body = await req.json();
      if (body.days_before) {
        daysBeforeBirthday = parseInt(body.days_before, 10);
      }
    } catch {
      // No body provided
    }

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysBeforeBirthday);
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    console.log(`Checking for birthdays on ${targetMonth}/${targetDay}`);

    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", "birthday_reminder")
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      throw new Error("Birthday reminder email template not found or inactive");
    }

    const template = templateData as EmailTemplate;

    const { data: employees, error: employeesError } = await supabase
      .from("employee_profiles")
      .select("id, user_id, full_name, display_name, email, birthday, photo_url, organization_id")
      .eq("is_active", true)
      .not("birthday", "is", null);

    if (employeesError) throw employeesError;

    const upcomingBirthdays = (employees || []).filter((emp: EmployeeProfile) => {
      if (!emp.birthday) return false;
      const [, month, day] = emp.birthday.split("-").map(Number);
      return month === targetMonth && day === targetDay;
    });

    if (upcomingBirthdays.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming birthdays", date: `${targetMonth}/${targetDay}` }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group birthdays by organization
    const birthdaysByOrg = new Map<string, EmployeeProfile[]>();
    for (const emp of upcomingBirthdays) {
      const orgId = emp.organization_id || "unknown";
      if (!birthdaysByOrg.has(orgId)) birthdaysByOrg.set(orgId, []);
      birthdaysByOrg.get(orgId)!.push(emp);
    }

    let totalSent = 0;

    for (const [orgId, orgBirthdays] of birthdaysByOrg) {
      // Get leadership for this org
      const { data: leadershipRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "manager"]);

      const leadershipUserIds = [...new Set((leadershipRoles || []).map(r => r.user_id))];
      if (leadershipUserIds.length === 0) continue;

      const { data: leadershipProfiles } = await supabase
        .from("employee_profiles")
        .select("user_id, full_name, email")
        .in("user_id", leadershipUserIds)
        .eq("is_active", true)
        .not("email", "is", null);

      const leadershipEmails = (leadershipProfiles || []).map(p => p.email).filter(Boolean);
      if (leadershipEmails.length === 0) continue;

      const birthdayList = orgBirthdays
        .map(emp => `<li style="margin-bottom: 8px;">🎂 <strong>${emp.display_name || emp.full_name}</strong></li>`)
        .join("");

      const birthdayNames = orgBirthdays.map(emp => emp.display_name || emp.full_name).join(", ");

      const dateFormatted = targetDate.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      });

      const templateVariables: Record<string, string> = {
        birthday_date: dateFormatted,
        birthday_count: orgBirthdays.length.toString(),
        birthday_list: birthdayList,
        birthday_names: birthdayNames,
        days_until: daysBeforeBirthday.toString(),
      };

      const emailSubject = replaceTemplateVariables(template.subject, templateVariables);
      const emailHtml = replaceTemplateVariables(template.html_body, templateVariables);

      if (orgId !== "unknown") {
        await sendOrgEmail(supabase, orgId, {
          to: leadershipEmails,
          subject: emailSubject,
          html: emailHtml,
        });
      } else {
        // Fallback: send without org branding
        const { sendEmail } = await import("../_shared/email-sender.ts");
        await sendEmail({
          to: leadershipEmails,
          subject: emailSubject,
          html: emailHtml,
        });
      }

      totalSent += leadershipEmails.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Birthday reminders sent for ${upcomingBirthdays.length} team member(s)`,
        recipients: totalSent,
        birthdays: upcomingBirthdays.map((e: EmployeeProfile) => e.display_name || e.full_name),
        template_used: template.name,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-birthday-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
