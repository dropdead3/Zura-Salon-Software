/**
 * supply-intelligence-digest — Weekly email digest of Supply Intelligence KPIs + top insights.
 * Scheduled via pg_cron (Sunday 6 PM UTC).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Get active organizations
    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("is_active", true);

    if (orgError) throw orgError;

    let sentCount = 0;
    let skippedCount = 0;

    for (const org of orgs ?? []) {
      try {
        // Check digest frequency setting
        const { data: freqSetting } = await supabase
          .from("backroom_settings")
          .select("setting_value")
          .eq("organization_id", org.id)
          .is("location_id", null)
          .eq("setting_key", "supply_digest_frequency")
          .maybeSingle();

        const frequency = (freqSetting?.setting_value as any)?.frequency ?? "weekly";
        if (frequency === "off") {
          skippedCount++;
          continue;
        }

        // For daily: send every day. For weekly: only on Sundays (day 0).
        const today = new Date().getUTCDay();
        if (frequency === "weekly" && today !== 0) {
          skippedCount++;
          continue;
        }
        // Fetch latest cached supply intelligence
        const { data: cached } = await supabase
          .from("ai_business_insights")
          .select("insights, generated_at")
          .eq("organization_id", org.id)
          .like("location_id", "supply:%")
          .order("generated_at", { ascending: false })
          .limit(1);

        const row = cached?.[0];
        if (!row?.insights) {
          skippedCount++;
          continue;
        }

        const intel = row.insights as any;
        const kpis = intel.kpis;
        const insights = (intel.insights ?? []) as any[];
        const topInsights = insights
          .sort((a: any, b: any) => {
            const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
            return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
          })
          .slice(0, 5);

        if (topInsights.length === 0) {
          skippedCount++;
          continue;
        }

        // Get org admin emails
        const { data: admins } = await supabase
          .from("organization_admins")
          .select("user_id")
          .eq("organization_id", org.id);

        if (!admins || admins.length === 0) {
          skippedCount++;
          continue;
        }

        // Resolve emails from auth
        const adminEmails: string[] = [];
        for (const admin of admins) {
          const { data: userData } = await supabase.auth.admin.getUserById(
            admin.user_id,
          );
          if (userData?.user?.email) {
            adminEmails.push(userData.user.email);
          }
        }

        if (adminEmails.length === 0) {
          skippedCount++;
          continue;
        }

        // Build HTML email
        const html = buildDigestHtml(org.name, kpis, topInsights, row.generated_at);

        await sendOrgEmail(supabase, org.id, {
          to: adminEmails,
          subject: `Weekly Supply Intelligence — ${org.name}`,
          html,
          emailType: "transactional",
        });

        sentCount++;
      } catch (orgErr: any) {
        console.error(
          `[supply-digest] Error processing org ${org.id}:`,
          orgErr,
        );
        skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        skipped: skippedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[supply-digest] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function buildDigestHtml(
  orgName: string,
  kpis: any,
  insights: any[],
  generatedAt: string,
): string {
  const severityColors: Record<string, string> = {
    critical: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  const severityLabels: Record<string, string> = {
    critical: "🔴",
    warning: "🟡",
    info: "🔵",
  };

  const insightsHtml = insights
    .map((i: any) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 14px;">${severityLabels[i.severity] ?? "🔵"}</span>
          <div>
            <div style="font-size: 11px; color: ${severityColors[i.severity] ?? "#6b7280"}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
              ${i.category}
            </div>
            <div style="font-size: 14px; font-weight: 500; color: #111827; margin-bottom: 4px;">
              ${i.title}
            </div>
            <div style="font-size: 13px; color: #6b7280;">
              ${i.description}
            </div>
            ${i.estimated_annual_impact > 0 ? `<div style="font-size: 12px; color: #059669; margin-top: 4px;">Est. annual impact: $${i.estimated_annual_impact.toLocaleString()}</div>` : ""}
          </div>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px 24px 20px; color: white;">
        <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 500; letter-spacing: 0.05em;">
          SUPPLY INTELLIGENCE
        </h1>
        <p style="margin: 0; font-size: 13px; opacity: 0.8;">
          Weekly Digest for ${orgName} — ${formattedDate}
        </p>
      </div>

      <!-- KPIs -->
      <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Annual Waste</div>
              <div style="font-size: 22px; font-weight: 500; color: #ef4444;">$${(kpis?.annual_waste_cost ?? 0).toLocaleString()}</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Reorder Risk</div>
              <div style="font-size: 22px; font-weight: 500; color: #f59e0b;">${kpis?.products_at_risk ?? 0}</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Margin Opp.</div>
              <div style="font-size: 22px; font-weight: 500; color: #059669;">+$${(kpis?.margin_opportunity_per_service ?? 0).toFixed(0)}/svc</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Usage Var.</div>
              <div style="font-size: 22px; font-weight: 500; color: #3b82f6;">${(kpis?.usage_variance_pct ?? 0).toFixed(0)}%</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Insights -->
      <div style="padding: 16px 24px 8px;">
        <h2 style="margin: 0 0 12px; font-size: 14px; font-weight: 500; color: #374151; text-transform: uppercase; letter-spacing: 0.08em;">
          Top Insights
        </h2>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${insightsHtml}
      </table>

      <!-- Footer -->
      <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Powered by Zura Supply Intelligence
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
