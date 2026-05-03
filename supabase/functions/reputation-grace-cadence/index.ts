// Reputation grace cadence — fires day-3, day-14, day-28 reminder emails to
// orgs in the 30-day past_due grace window. Idempotent via
// reputation_grace_emails_sent (UNIQUE on org+grace_until+stage).
//
// Cron: hourly. Each org receives at most one email per stage per grace window.
// Memory: mem://features/reputation-subscription-gating
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Stage = "day_3" | "day_14" | "day_28";
const STAGE_OFFSET_DAYS: Record<Stage, number> = { day_3: 3, day_14: 14, day_28: 28 };

function dueStage(graceUntil: Date, now: Date): Stage | null {
  // grace_until = past_due + 30d. Stage N fires after N days inside grace.
  const startedAt = new Date(graceUntil.getTime() - 30 * 86_400_000);
  const elapsedDays = (now.getTime() - startedAt.getTime()) / 86_400_000;
  // Walk newest stage first so we fire at most one per run.
  if (elapsedDays >= 28) return "day_28";
  if (elapsedDays >= 14) return "day_14";
  if (elapsedDays >= 3) return "day_3";
  return null;
}

const STAGE_COPY: Record<Stage, { subject: (d: string) => string; headline: string; lede: (d: string) => string }> = {
  day_3: {
    subject: (d) => `Reminder: Zura Reputation paused — restore by ${d}`,
    headline: "Heads up — your Reputation engine is paused",
    lede: (d) =>
      `Your last payment didn't go through. You have until <strong>${d}</strong> to update your card before curated reviews on your website are auto-hidden.`,
  },
  day_14: {
    subject: (d) => `Halfway through grace — Zura Reputation cancels on ${d}`,
    headline: "You're halfway through the 30-day grace window",
    lede: (d) =>
      `If we don't recover payment by <strong>${d}</strong>, the curated reviews on your website will be hidden and review requests will stay paused.`,
  },
  day_28: {
    subject: (d) => `Final notice: Zura Reputation cancels in 48 hours (${d})`,
    headline: "Final notice — 48 hours to restore Reputation",
    lede: (d) =>
      `This is the last reminder before <strong>${d}</strong>. After that, curated website reviews are auto-hidden until you re-subscribe.`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendKey ? new Resend(resendKey) : null;

  try {
    const now = new Date();
    const { data: pastDue, error } = await supabase
      .from("reputation_subscriptions")
      .select("organization_id, grace_until")
      .eq("status", "past_due")
      .not("grace_until", "is", null);
    if (error) throw error;

    let sent = 0;
    let skipped = 0;

    for (const row of pastDue ?? []) {
      const graceUntil = new Date(row.grace_until as string);
      const stage = dueStage(graceUntil, now);
      if (!stage) {
        skipped++;
        continue;
      }

      // Reservation: insert dedupe row first; UNIQUE constraint blocks dupes.
      const { error: reserveErr } = await supabase
        .from("reputation_grace_emails_sent")
        .insert({
          organization_id: row.organization_id,
          grace_until: row.grace_until,
          stage,
        });
      if (reserveErr) {
        // 23505 unique_violation = already sent this stage. That's the success path.
        if ((reserveErr as { code?: string }).code !== "23505") {
          console.error("[reputation-grace-cadence] reserve failed", reserveErr);
        }
        skipped++;
        continue;
      }

      if (!resend) {
        console.log("[reputation-grace-cadence] Resend not configured — reserved but no send");
        continue;
      }

      try {
        const { data: org } = await supabase
          .from("organizations")
          .select("name, slug, billing_email, primary_contact_email")
          .eq("id", row.organization_id)
          .single();
        const recipient = org?.billing_email || org?.primary_contact_email;
        if (!recipient) {
          console.log(`[reputation-grace-cadence] no recipient for org ${row.organization_id}`);
          continue;
        }

        const dateStr = graceUntil.toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        });
        const copy = STAGE_COPY[stage];
        await resend.emails.send({
          from: "Zura <notifications@mail.getzura.com>",
          to: [recipient],
          subject: copy.subject(dateStr),
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
              <div style="background:#000;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
                <h1 style="margin:0;font-size:18px;font-weight:500;letter-spacing:0.04em;">ZURA REPUTATION</h1>
              </div>
              <div style="padding:24px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="margin:0 0 16px;font-size:18px;color:#000;">${copy.headline}</h2>
                <p style="margin:0 0 16px;color:#27272a;line-height:1.5;">${copy.lede(dateStr)}</p>
                <a href="https://getzura.com/org/${org?.slug ?? ""}/dashboard/admin/feedback"
                   style="display:inline-block;background:#000;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
                  Update payment method
                </a>
                <p style="margin:24px 0 0;font-size:12px;color:#71717a;">Stage: ${stage.replace("_", " ")} · Grace ends ${dateStr}</p>
              </div>
            </div>
          `,
        });

        await supabase
          .from("reputation_grace_emails_sent")
          .update({ email_recipient: recipient })
          .eq("organization_id", row.organization_id)
          .eq("grace_until", row.grace_until)
          .eq("stage", stage);

        sent++;
      } catch (sendErr) {
        console.error("[reputation-grace-cadence] send failed", sendErr);
      }
    }

    return new Response(JSON.stringify({ sent, skipped, examined: pastDue?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reputation-grace-cadence] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
