import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendOrgEmail, formatEmailCurrency } from "../_shared/email-sender.ts";

/**
 * stylist-trend-digest — Weekly trend projections email for stylists.
 *
 * Triggered by pg_cron (Monday 8 AM) or manually. Iterates per-org,
 * per-stylist, computes velocity + projection, calls AI for a summary,
 * and sends a branded email.
 */

const PAGE_SIZE = 1000;

async function fetchAllRows(supabase: any, queryBuilder: (from: number, to: number) => any): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryBuilder(from, to);
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...data);
      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Get all active orgs with stylist levels configured
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("is_active", true);
    if (orgsErr) throw orgsErr;

    let totalSent = 0;
    let totalSkipped = 0;

    for (const org of orgs || []) {
      // Get stylist levels for this org
      const { data: levels } = await supabase
        .from("stylist_levels")
        .select("id, slug, name, display_order, criteria")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("display_order");

      if (!levels?.length) continue;

      // Get all stylists in this org
      const { data: stylists } = await supabase
        .from("employee_profiles")
        .select("user_id, first_name, last_name, stylist_level, email, location_id")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .not("stylist_level", "is", null);

      if (!stylists?.length) continue;

      // Get org slug for deep link
      const { data: orgData } = await supabase
        .from("organizations")
        .select("slug")
        .eq("id", org.id)
        .single();
      const orgSlug = orgData?.slug || "";

      const sortedLevels = [...levels].sort((a: any, b: any) => a.display_order - b.display_order);

      for (const stylist of stylists) {
        if (!stylist.email) {
          totalSkipped++;
          continue;
        }

        const currentLevel = sortedLevels.find((l: any) => l.slug === stylist.stylist_level);
        if (!currentLevel) continue;

        const currentIdx = sortedLevels.indexOf(currentLevel);
        const nextLevel = currentIdx < sortedLevels.length - 1 ? sortedLevels[currentIdx + 1] : null;
        const isTopLevel = !nextLevel;

        // Fetch KPI data for this stylist (90-day window)
        const evalDays = 90;
        const now = new Date();
        const endStr = now.toISOString().slice(0, 10);
        const evalStart = new Date(now.getTime() - evalDays * 86400000);
        const evalStartStr = evalStart.toISOString().slice(0, 10);
        const priorStart = new Date(now.getTime() - evalDays * 2 * 86400000);
        const priorStartStr = priorStart.toISOString().slice(0, 10);

        // Get transaction data with pagination
        const sales = await fetchAllRows(supabase, (from, to) =>
          supabase
            .from("phorest_transaction_items")
            .select("total_amount, tax_amount, item_type, transaction_date")
            .eq("stylist_user_id", stylist.user_id)
            .gte("transaction_date", priorStartStr)
            .lte("transaction_date", endStr)
            .range(from, to)
        );

        // Get appointment data with pagination
        const appts = await fetchAllRows(supabase, (from, to) =>
          supabase
            .from("appointments")
            .select("total_price, rebooked_at_checkout, appointment_date, status, is_new_client, duration_minutes, client_id")
            .eq("staff_user_id", stylist.user_id)
            .gte("appointment_date", priorStartStr)
            .lte("appointment_date", endStr)
            .neq("status", "cancelled")
            .range(from, to)
        );

        // Compute KPIs for current and prior windows
        const kpis = computeWindowKpis(sales, appts, evalStartStr, endStr, evalDays);
        const priorKpis = computeWindowKpis(sales, appts, priorStartStr, evalStartStr, evalDays);

        // Parse criteria — use current level criteria for top-level (maintenance), next level for progression
        const targetLevel = isTopLevel ? currentLevel : nextLevel!;
        const criteria = targetLevel.criteria as any;
        if (!criteria) continue;

        // Build projection summary
        const projectionLines: string[] = [];
        const kpiMap: Record<string, { current: number; prior: number; target: number; unit: string; label: string }> = {};

        if (criteria.min_revenue) {
          kpiMap.revenue = { current: kpis.monthlyRevenue, prior: priorKpis.monthlyRevenue, target: criteria.min_revenue, unit: "/mo", label: "Revenue" };
        }
        if (criteria.min_retail_pct) {
          kpiMap.retail = { current: kpis.retailPct, prior: priorKpis.retailPct, target: criteria.min_retail_pct, unit: "%", label: "Retail %" };
        }
        if (criteria.min_rebook_pct) {
          kpiMap.rebooking = { current: kpis.rebookPct, prior: priorKpis.rebookPct, target: criteria.min_rebook_pct, unit: "%", label: "Rebooking" };
        }
        if (criteria.min_utilization_pct) {
          kpiMap.utilization = { current: kpis.utilization, prior: priorKpis.utilization, target: criteria.min_utilization_pct, unit: "%", label: "Utilization" };
        }
        if (criteria.min_avg_ticket) {
          kpiMap.avg_ticket = { current: kpis.avgTicket, prior: priorKpis.avgTicket, target: criteria.min_avg_ticket, unit: "$", label: "Avg Ticket" };
        }
        if (criteria.min_rev_per_hour) {
          kpiMap.rev_per_hour = { current: kpis.revPerHour, prior: priorKpis.revPerHour, target: criteria.min_rev_per_hour, unit: "$/hr", label: "Rev/Hour" };
        }
        if (criteria.min_retention_pct) {
          // Skip retention velocity — prior window retention is unreliable (see comment in computeWindowKpis)
          kpiMap.retention = { current: kpis.retentionRate, prior: kpis.retentionRate, target: criteria.min_retention_pct, unit: "%", label: "Retention" };
        }
        if (criteria.min_new_clients) {
          kpiMap.new_clients = { current: kpis.newClientsPerMonth, prior: priorKpis.newClientsPerMonth, target: criteria.min_new_clients, unit: "/mo", label: "New Clients" };
        }

        let allMet = true;
        let hasDeclining = false;
        for (const [key, kpi] of Object.entries(kpiMap)) {
          const velocity = (kpi.current - kpi.prior) / evalDays;
          const gap = kpi.target - kpi.current;
          const isMet = gap <= 0;
          if (!isMet) allMet = false;
          const trajectory = kpi.current > kpi.prior * 1.03 ? "improving" : kpi.current < kpi.prior * 0.97 ? "declining" : "flat";
          if (trajectory === "declining") hasDeclining = true;
          const daysToTarget = velocity > 0 && gap > 0 ? Math.ceil(gap / velocity) : null;

          projectionLines.push(
            `${kpi.label}: ${formatKpiVal(kpi.current, kpi.unit)} / ${formatKpiVal(kpi.target, kpi.unit)} — ${trajectory}${daysToTarget ? ` (~${daysToTarget}d)` : ""}`
          );
        }

        // Skip digest: progression stylists who are fully qualified, or top-level with no declining metrics
        if (!isTopLevel && allMet) {
          totalSkipped++;
          continue;
        }
        if (isTopLevel && !hasDeclining) {
          totalSkipped++;
          continue;
        }

        // Generate AI summary
        let aiSummary = "";
        if (lovableApiKey) {
          try {
            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content: "You are a brief, advisory performance coach for salon stylists. Write 2 sentences max. Calm, structured tone. No exclamation marks. Reference specific numbers.",
                  },
                  {
                    role: "user",
                    content: isTopLevel
                      ? `${stylist.first_name} is at ${currentLevel.name} (top level, maintenance mode).\n\nKPIs:\n${projectionLines.join("\n")}\n\nWrite a 2-sentence maintenance update noting the declining metrics.`
                      : `${stylist.first_name} is at ${currentLevel.name}, working toward ${nextLevel!.name}.\n\nKPIs:\n${projectionLines.join("\n")}\n\nWrite a 2-sentence weekly update.`,
                  },
                ],
              }),
            });

            if (aiResp.ok) {
              const aiData = await aiResp.json();
              aiSummary = aiData.choices?.[0]?.message?.content || "";
            } else {
              await aiResp.text(); // consume body
            }
          } catch (e: any) {
            console.warn("[trend-digest] AI summary failed:", e);
          }
        }

        // Build deep link
        const deepLink = orgSlug ? `https://getzura.com/org/${orgSlug}/dashboard/my-graduation` : "";

        const levelLabel = isTopLevel
          ? `${currentLevel.name} — Maintenance`
          : `${currentLevel.name} → ${nextLevel!.name}`;

        // Build email HTML
        const html = buildDigestHtml(
          stylist.first_name || "Stylist",
          currentLevel.name,
          isTopLevel ? "Maintenance" : nextLevel!.name,
          projectionLines,
          aiSummary,
          deepLink,
        );

        const result = await sendOrgEmail(supabase, org.id, {
          to: [stylist.email],
          subject: `Your Weekly Progress — ${levelLabel}`,
          html,
          emailType: "transactional",
        });

        if (result.success && !result.skipped) {
          totalSent++;
        } else {
          totalSkipped++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, skipped: totalSkipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[stylist-trend-digest] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ----- Helpers -----

interface WindowKpis {
  monthlyRevenue: number;
  retailPct: number;
  rebookPct: number;
  utilization: number;
  avgTicket: number;
  revPerHour: number;
  retentionRate: number;
  newClientsPerMonth: number;
}

function computeWindowKpis(
  sales: any[],
  appts: any[],
  startStr: string,
  endStr: string,
  evalDays: number,
): WindowKpis {
  let serviceRev = 0, productRev = 0;
  for (const s of sales) {
    if (s.transaction_date < startStr || s.transaction_date >= endStr) continue;
    const amount = (Number(s.total_amount) || 0) + (Number(s.tax_amount) || 0);
    const itemType = (s.item_type || "").toLowerCase();
    if (itemType === "service" || itemType === "sale_fee" || itemType === "special_offer_item") {
      serviceRev += amount;
    } else {
      productRev += amount;
    }
  }

  const windowAppts = (appts || []).filter((a: any) => a.appointment_date >= startStr && a.appointment_date < endStr && a.status !== "no_show"
  );
  const rebooked = windowAppts.filter((a: any) => a.rebooked_at_checkout).length;
  const totalMin = windowAppts.reduce((s: any, a: any) => s + (Number(a.duration_minutes) || 60), 0);
  const activeDays = new Set(windowAppts.map((a: any) => a.appointment_date)).size;
  const totalRev = serviceRev + productRev;

  // Avg ticket
  const uniqueVisits = new Set(
    windowAppts.filter((a: any) => a.client_id).map((a: any) => `${a.client_id}_${a.appointment_date}`)
  ).size || windowAppts.length;
  const avgTicket = uniqueVisits > 0 ? totalRev / uniqueVisits : 0;

  // Rev per hour
  const revPerHour = totalMin > 0 ? (totalRev / totalMin) * 60 : 0;

  // Retention: compare current window clients to prior window
  // Note: For the prior window computation, retention would need a third window
  // of appointment data which we don't fetch. We only compute retention for the
  // current (eval) window and set prior retention to 0, skipping retention velocity
  // in digest emails.
  const windowClients = new Set(windowAppts.filter((a: any) => a.client_id).map((a: any) => a.client_id));
  const priorAppts = (appts || []).filter((a: any) => a.appointment_date < startStr && a.status !== "no_show" && a.client_id
  );
  const priorClients = new Set(priorAppts.map((a: any) => a.client_id));
  let retentionRate = 0;
  if (priorClients.size > 0) {
    const returning = [...windowClients].filter((id: any) => priorClients.has(id)).length;
    retentionRate = (returning / priorClients.size) * 100;
  }

  // New clients
  const newClients = windowAppts.filter((a: any) => a.is_new_client).length;

  return {
    monthlyRevenue: evalDays > 0 ? (totalRev / evalDays) * 30 : 0,
    retailPct: totalRev > 0 ? (productRev / totalRev) * 100 : 0,
    rebookPct: windowAppts.length > 0 ? (rebooked / windowAppts.length) * 100 : 0,
    utilization: activeDays > 0 ? Math.min(100, (totalMin / activeDays / 480) * 100) : 0,
    avgTicket,
    revPerHour,
    retentionRate,
    newClientsPerMonth: evalDays > 0 ? (newClients / evalDays) * 30 : 0,
  };
}

function formatKpiVal(value: number, unit: string): string {
  if (unit === "/mo" || unit === "$" || unit === "$/hr") return formatEmailCurrency(value);
  if (unit === "%") return `${value.toFixed(1)}%`;
  return String(Math.round(value));
}

function buildDigestHtml(
  firstName: string,
  currentLevel: string,
  nextLevel: string,
  projectionLines: string[],
  aiSummary: string,
  deepLink: string,
): string {
  const kpiRows = projectionLines
    .map((line: any) => `<tr><td style="padding:6px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${line}</td></tr>`)
    .join("");

  const escapedSummary = aiSummary
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const summaryBlock = escapedSummary
    ? `<div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:12px 16px;border-radius:6px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">${escapedSummary}</p>
      </div>`
    : "";

  const ctaBlock = deepLink
    ? `<a href="${deepLink}" style="display:inline-block;margin:16px 0 0;padding:10px 20px;background:#111827;color:#ffffff;font-size:13px;text-decoration:none;border-radius:6px;">View Full Scorecard</a>`
    : `<p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">View your full scorecard and daily targets in your Level Progress page.</p>`;

  return `
    <h2 style="margin:0 0 4px;font-size:18px;color:#111827;">Weekly Progress Update</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">${currentLevel} → ${nextLevel}</p>

    <p style="font-size:14px;color:#374151;margin:0 0 16px;">
      Hi ${firstName}, here's your 90-day trend snapshot for the week.
    </p>

    ${summaryBlock}

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr><th style="text-align:left;font-size:11px;color:#9ca3af;padding:0 0 8px;border-bottom:2px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.05em;">KPI Projections</th></tr>
      </thead>
      <tbody>
        ${kpiRows}
      </tbody>
    </table>

    ${ctaBlock}
  `;
}
