import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail, formatEmailDate } from "../_shared/email-sender.ts";
import { sendSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayrollSettings {
  organization_id: string;
  pay_schedule_type: string;
  semi_monthly_first_day: number;
  semi_monthly_second_day: number;
  bi_weekly_day_of_week: number;
  bi_weekly_start_date: string | null;
  weekly_day_of_week: number;
  monthly_pay_day: number;
  days_until_check: number;
  reminder_enabled: boolean | null;
  reminder_days_before: number[] | null;
  reminder_channels: { email?: boolean; push?: boolean; sms_on_missed?: boolean } | null;
}

function getCurrentPeriodEnd(settings: PayrollSettings, today: Date): Date | null {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  switch (settings.pay_schedule_type) {
    case "semi_monthly": {
      const { semi_monthly_first_day, semi_monthly_second_day } = settings;
      if (day <= semi_monthly_first_day) return new Date(year, month, semi_monthly_first_day - 1);
      if (day <= semi_monthly_second_day) return new Date(year, month, semi_monthly_second_day - 1);
      return new Date(year, month + 1, 0);
    }
    case "monthly": return new Date(year, month + 1, 0);
    case "weekly": {
      const todayDow = today.getDay();
      const diff = (settings.weekly_day_of_week - todayDow + 7) % 7;
      const end = new Date(today);
      end.setDate(day + diff);
      return end;
    }
    default: return null;
  }
}

function getCurrentPeriodStart(settings: PayrollSettings, today: Date): Date | null {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  switch (settings.pay_schedule_type) {
    case "semi_monthly": {
      const { semi_monthly_first_day, semi_monthly_second_day } = settings;
      if (day >= semi_monthly_second_day) return new Date(year, month, semi_monthly_second_day);
      if (day >= semi_monthly_first_day) return new Date(year, month, semi_monthly_first_day);
      return new Date(year, month - 1, semi_monthly_second_day);
    }
    case "monthly": return new Date(year, month, 1);
    case "weekly": {
      const todayDow = today.getDay();
      const startDow = (settings.weekly_day_of_week + 1) % 7;
      const diff = (todayDow - startDow + 7) % 7;
      const start = new Date(today);
      start.setDate(day - diff);
      return start;
    }
    default: return null;
  }
}

function formatDate(d: Date): string { return d.toISOString().split("T")[0]; }
function formatDisplayDate(d: Date): string { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function diffDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function buildReminderEmail(daysLeft: number, periodRange: string, checkDate: string, actionUrl: string): string {
  if (daysLeft < 0) {
    // Missed deadline
    return `
      <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
        <span style="font-size:18px;">⚠️</span>
        <span style="font-size:14px;font-weight:600;color:#991b1b;">URGENT: Payroll Deadline Missed</span>
      </div>
      <p style="font-size:14px;color:#374151;margin:0 0 8px;">
        Payroll for <strong>${periodRange}</strong> was due and has not been submitted.
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        Please submit payroll immediately to avoid delays in employee pay.
      </p>
      <a href="${actionUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        Run Payroll Now →
      </a>`;
  }
  if (daysLeft === 0) {
    return `
      <h1 style="font-size:20px;margin:0 0 8px;color:#111827;">Payroll Submission Due Today</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Period: ${periodRange} · Check Date: ${checkDate}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        Your payroll submission for this period is due today. Please review and submit before end of day to ensure timely processing.
      </p>
      <a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        Run Payroll →
      </a>`;
  }
  // Upcoming reminder
  return `
    <h1 style="font-size:20px;margin:0 0 8px;color:#111827;">Payroll Deadline in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}</h1>
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Period: ${periodRange} · Check Date: ${checkDate}</p>
    <p style="font-size:14px;color:#374151;margin:0 0 24px;">
      Your payroll submission for this period is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Start preparing to ensure timely processing.
    </p>
    <a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Review Payroll →
    </a>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const today = new Date();
    const todayStr = formatDate(today);

    const { data: allSettings, error: settingsError } = await supabase
      .from("organization_payroll_settings")
      .select("*");

    if (settingsError) throw new Error(`Failed to fetch payroll settings: ${settingsError.message}`);
    if (!allSettings?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsSent = 0;

    for (const rawSettings of allSettings) {
      const settings = rawSettings as PayrollSettings;

      // Skip org if reminders are disabled
      if (settings.reminder_enabled === false) continue;

      const channels = settings.reminder_channels ?? { email: true, push: true, sms_on_missed: true };
      const reminderDays = settings.reminder_days_before ?? [3, 1, 0];

      const periodEnd = getCurrentPeriodEnd(settings, today);
      const periodStart = getCurrentPeriodStart(settings, today);
      if (!periodEnd || !periodStart) continue;

      const periodEndStr = formatDate(periodEnd);
      const periodStartStr = formatDate(periodStart);

      // Calculate days until deadline (negative = missed)
      const daysUntilDeadline = diffDays(today, periodEnd);

      // Check if today matches any configured reminder day
      const isReminderDay = reminderDays.includes(daysUntilDeadline);
      // Also check if deadline was missed (yesterday was deadline, daysUntilDeadline === -1)
      const isMissedDeadline = daysUntilDeadline === -1;

      if (!isReminderDay && !isMissedDeadline) continue;

      const { data: existingRuns } = await supabase
        .from("payroll_runs")
        .select("id")
        .eq("organization_id", settings.organization_id)
        .eq("pay_period_start", periodStartStr)
        .eq("pay_period_end", periodEndStr)
        .in("status", ["submitted", "processing", "processed", "completed"])
        .limit(1);

      if (existingRuns && existingRuns.length > 0) continue;

      const { data: payrollPermission } = await supabase
        .from("permissions").select("id").eq("name", "manage_payroll").single();
      if (!payrollPermission) continue;

      const { data: rolePerms } = await supabase
        .from("role_permissions").select("role").eq("permission_id", payrollPermission.id);
      const roles = rolePerms?.map((rp: any) => rp.role) || [];
      if (roles.length === 0) continue;

      const { data: userRoles } = await supabase
        .from("user_roles").select("user_id").in("role", roles);
      const userIds = [...new Set(userRoles?.map((ur: any) => ur.user_id) || [])];
      if (userIds.length === 0) continue;

      const { data: orgUsers } = await supabase
        .from("employee_profiles")
        .select("user_id, email")
        .eq("organization_id", settings.organization_id)
        .in("user_id", userIds)
        .eq("is_active", true);

      if (!orgUsers?.length) continue;

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id, payroll_deadline_enabled")
        .in("user_id", orgUsers.map((u: any) => u.user_id));
      const prefsMap = new Map(prefs?.map((p: any) => [p.user_id, p]) || []);

      const periodRange = `${formatDisplayDate(periodStart)} – ${formatDisplayDate(periodEnd)}`;
      const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace(".supabase.co", ".lovable.app")}`;
      const actionUrl = `${siteUrl}/dashboard/admin/payroll`;
      const checkDate = formatDisplayDate(new Date(periodEnd.getTime() + settings.days_until_check * 86400000));

      const effectiveDays = isMissedDeadline ? -1 : daysUntilDeadline;

      for (const user of orgUsers) {
        const userPref = prefsMap.get(user.user_id);
        if (userPref?.payroll_deadline_enabled === false) continue;

        // Email
        if (user.email && channels.email !== false) {
          const subjectPrefix = effectiveDays < 0 ? "URGENT: Payroll deadline missed" :
            effectiveDays === 0 ? "Payroll submission due today" :
            `Payroll deadline in ${effectiveDays} day${effectiveDays > 1 ? 's' : ''}`;

          await sendOrgEmail(supabase, settings.organization_id, {
            to: [user.email],
            subject: `${subjectPrefix} – ${periodRange}`,
            html: buildReminderEmail(effectiveDays, periodRange, checkDate, actionUrl),
          });
        }

        // Push notification
        if (channels.push !== false) {
          try {
            const title = effectiveDays < 0 ? "⚠️ Payroll Overdue" :
              effectiveDays === 0 ? "Payroll Due Today" :
              `Payroll Due in ${effectiveDays} Day${effectiveDays > 1 ? 's' : ''}`;
            const body = effectiveDays < 0
              ? `Payroll for ${periodRange} is overdue and has not been submitted.`
              : effectiveDays === 0
              ? `Payroll for ${periodRange} is due today.`
              : `Payroll for ${periodRange} is due in ${effectiveDays} day${effectiveDays > 1 ? 's' : ''}.`;

            await supabase.functions.invoke("send-push-notification", {
              body: { user_id: user.user_id, title, body, url: "/dashboard/admin/payroll" },
            });
          } catch (pushErr) {
            console.error(`Push failed for ${user.user_id}:`, pushErr);
          }
        }

        // SMS only on missed deadline
        if (isMissedDeadline && channels.sms_on_missed !== false) {
          const deadlineDate = formatDisplayDate(periodEnd);
          await sendSms(supabase, {
            to: user.email,
            templateKey: "payroll_deadline_missed",
            variables: { period_range: periodRange, deadline_date: deadlineDate, action_url: actionUrl },
          });
        }

        notificationsSent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[check-payroll-deadline] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
