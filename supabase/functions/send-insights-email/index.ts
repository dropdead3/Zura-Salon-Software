import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail, sendEmail } from "../_shared/email-sender.ts";
import { buildSignedUrl } from "../_shared/signed-url.ts";
import { PLATFORM_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Frequency helpers ──────────────────────────────────────────────
function calculateNextAt(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case "daily": {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(7, 0, 0, 0);
      return next.toISOString();
    }
    case "monday": {
      const next = new Date(now);
      const dayOfWeek = next.getDay();
      const daysUntilMon = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
      next.setDate(next.getDate() + daysUntilMon);
      next.setHours(7, 0, 0, 0);
      return next.toISOString();
    }
    case "weekly":
    default: {
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      next.setHours(7, 0, 0, 0);
      return next.toISOString();
    }
  }
}

// ── Sentiment helpers ──────────────────────────────────────────────
function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive": return "#16a34a";
    case "concerning": return "#dc2626";
    default: return "#ca8a04";
  }
}

function sentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case "positive": return "🟢";
    case "concerning": return "🔴";
    default: return "🟡";
  }
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    "revenue": "💰", "performance": "📊", "clients": "👥", "schedule": "📅",
    "staff": "🧑‍💼", "growth": "📈", "retention": "🔄", "operations": "⚙️",
    "My Performance": "📊", "My Clients": "👥", "My Schedule": "📅", "Growth Tips": "🌱",
  };
  return map[category] || "💡";
}

function priorityBadge(priority: string): string {
  switch (priority) {
    case "high": return '<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;padding:2px 8px;border-radius:12px;font-weight:600;margin-right:6px;">HIGH</span>';
    case "medium": return '<span style="display:inline-block;background:#fefce8;color:#ca8a04;font-size:11px;padding:2px 8px;border-radius:12px;font-weight:600;margin-right:6px;">MED</span>';
    default: return '<span style="display:inline-block;background:#f0fdf4;color:#16a34a;font-size:11px;padding:2px 8px;border-radius:12px;font-weight:600;margin-right:6px;">LOW</span>';
  }
}

// ── Inner content builder (no wrapper - sendOrgEmail handles that) ──
function buildInsightsContent(
  insights: any,
  userName: string,
  frequency: string,
  unsubscribeUrl: string,
  dashboardUrl: string,
): string {
  const summary = insights.summary || "Here are your latest insights.";
  const sentiment = insights.overallSentiment || "neutral";
  const items = insights.insights || [];
  const actions = insights.actionItems || [];
  const frequencyLabel = frequency === "daily" ? "Daily Digest" : frequency === "monday" ? "Monday Briefing" : "Weekly Summary";

  const insightCards = items.map((item: any) => `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:10px;">
      <div style="margin-bottom:6px;">
        <span style="font-size:18px;margin-right:6px;">${categoryEmoji(item.category || "")}</span>
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">${item.category || ""}</span>
      </div>
      <h3 style="margin:0 0 4px 0;font-size:15px;color:#111827;font-weight:600;">${item.title || ""}</h3>
      <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.5;">${item.description || ""}</p>
    </div>
  `).join("");

  const actionList = actions.length > 0
    ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:10px;">
        <h3 style="margin:0 0 10px 0;font-size:15px;color:#111827;font-weight:600;">🎯 Action Items</h3>
        <ol style="margin:0;padding-left:20px;">
          ${actions.map((a: any) => `
            <li style="margin-bottom:8px;font-size:14px;color:#374151;line-height:1.5;">
              ${priorityBadge(a.priority || "low")}${a.title || a.action || ""}
              ${a.description ? `<br/><span style="color:#6b7280;font-size:13px;">${a.description}</span>` : ""}
            </li>
          `).join("")}
        </ol>
      </div>`
    : "";

  return `
    <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">${frequencyLabel} for ${userName}</p>
    
    <div style="border-left:3px solid ${sentimentColor(sentiment)};padding:12px 16px;margin:16px 0;background:#fafafa;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">
        ${sentimentEmoji(sentiment)} <strong style="color:${sentimentColor(sentiment)};">${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}</strong> — ${summary}
      </p>
    </div>

    ${insightCards}
    ${actionList}

    <div style="text-align:center;padding:16px 0 8px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Open Dashboard</a>
    </div>

    <p style="text-align:center;margin:16px 0 0;font-size:12px;color:#a1a1aa;">
      <a href="${unsubscribeUrl}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe from insights emails</a>
    </p>
  `;
}

// ── Main Handler ───────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    let userId: string | null = null;
    let isTestSend = false;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));

    if (body.userId && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userData.user.id !== body.userId) {
        return new Response(JSON.stringify({ error: "Can only send test emails to yourself" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = body.userId;
      isTestSend = true;
    }

    let usersToProcess: any[] = [];

    if (isTestSend && userId) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (prefs) usersToProcess = [prefs];
    } else {
      const { data: dueUsers } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("insights_email_enabled", true)
        .lte("insights_email_next_at", new Date().toISOString());
      usersToProcess = dueUsers || [];
    }

    console.log(`[send-insights-email] Processing ${usersToProcess.length} users (test=${isTestSend})`);

    let sent = 0;
    let failed = 0;
    const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace('.supabase.co', '.lovable.app');

    for (const prefs of usersToProcess) {
      try {
        const uid = prefs.user_id;

        const { data: authUser } = await supabase.auth.admin.getUserById(uid);
        if (!authUser?.user?.email) {
          console.log(`[send-insights-email] No email for user ${uid}, skipping`);
          failed++;
          continue;
        }

        const { data: profile } = await supabase
          .from("employee_profiles")
          .select("first_name, last_name, organization_id")
          .eq("user_id", uid)
          .maybeSingle();
        const userName = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          : authUser.user.email.split("@")[0];
        const organizationId = profile?.organization_id;

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const roleList = (roles || []).map((r: any) => r.role);
        const isLeadership = roleList.some((r: string) =>
          ["super_admin", "admin", "manager"].includes(r)
        );

        let insights: any = null;
        if (isLeadership && organizationId) {
          const { data: bi } = await supabase
            .from("ai_business_insights")
            .select("insights")
            .eq("organization_id", organizationId)
            .order("generated_at", { ascending: false })
            .limit(1);
          if (bi?.[0]) insights = bi[0].insights;
        } else {
          const { data: pi } = await supabase
            .from("ai_personal_insights")
            .select("insights")
            .eq("user_id", uid)
            .order("generated_at", { ascending: false })
            .limit(1);
          if (pi?.[0]) insights = pi[0].insights;
        }

        if (!insights) {
          console.log(`[send-insights-email] No insights for user ${uid}, skipping`);
          failed++;
          continue;
        }

        // Build unsubscribe URL using shared utility
        const unsubscribeUrl = await buildSignedUrl("unsubscribe-insights-email", { uid, ts: Date.now() });

        const dashboardUrl = `${siteUrl}/dashboard`;
        const frequency = prefs.insights_email_frequency || "weekly";
        const subjectPrefix = isTestSend ? "[TEST] " : "";
        const subject = `${subjectPrefix}Your ${frequency === "daily" ? "Daily" : frequency === "monday" ? "Monday" : "Weekly"} ${PLATFORM_NAME} Insights`;

        const innerHtml = buildInsightsContent(insights, userName, frequency, unsubscribeUrl, dashboardUrl);

        // Use org-branded email if we have an org context
        let result;
        if (organizationId) {
          result = await sendOrgEmail(supabase, organizationId, {
            to: [authUser.user.email],
            subject,
            html: innerHtml,
          });
        } else {
          result = await sendEmail({
            to: [authUser.user.email],
            subject,
            html: innerHtml,
          });
        }

        if (result.success) {
          sent++;
          await supabase
            .from("notification_preferences")
            .update({
              insights_email_last_sent: new Date().toISOString(),
              insights_email_next_at: calculateNextAt(frequency),
            })
            .eq("user_id", uid);
        } else {
          console.error(`[send-insights-email] Failed for ${uid}:`, result.error);
          failed++;
        }
      } catch (userErr) {
        console.error(`[send-insights-email] Error processing user:`, userErr);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: usersToProcess.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-insights-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
