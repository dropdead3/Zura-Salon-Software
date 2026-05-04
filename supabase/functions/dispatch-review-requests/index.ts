// Phase 2: Reputation Engine dispatcher.
//
// Two-pass cron job (runs hourly via pg_cron):
//   1. ENQUEUE: scan recent completed appointments and create dispatch queue
//      rows for any that match an active automation rule and aren't already
//      queued (frequency cap + service exclusion enforced).
//   2. SEND:    pull due queue rows (scheduled_for <= now), generate a
//      client_feedback_responses token, render the SMS template, send via
//      Twilio (best-effort), and stamp the row with sent_at / skipped_reason.
//
// All writes use the service role; RLS does not apply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms-sender.ts";
import { checkReputationKillSwitch } from "../_shared/reputation-kill-switch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_FEEDBACK_BASE = Deno.env.get("PUBLIC_FEEDBACK_BASE_URL") ??
  "https://getzura.com/feedback";

interface FairnessTelemetry {
  // Per-org enqueue/send counts so platform staff can see when the
  // fairness allocator is actually clamping. `cappedOrgs` = orgs that
  // hit PER_ORG_*_CAP this tick (early signal to raise GLOBAL_SEND_POOL
  // or shorten the cron interval).
  orgsServed: number;
  maxPerOrg: number;
  cappedOrgs: number;
}

interface DispatchSummary {
  enqueued: number;
  sent: number;
  skipped: number;
  errors: number;
  enqueueFairness?: FairnessTelemetry;
  sendFairness?: FairnessTelemetry;
}

function isExcluded(
  serviceCategory: string | null,
  serviceName: string | null,
  rule: { excluded_service_categories?: string[] | null; excluded_service_names?: string[] | null; eligible_service_categories?: string[] | null },
): boolean {
  const cats = rule.excluded_service_categories ?? [];
  const names = rule.excluded_service_names ?? [];
  if (serviceCategory && cats.includes(serviceCategory)) return true;
  if (serviceName && names.includes(serviceName)) return true;
  if (rule.eligible_service_categories?.length && serviceCategory && !rule.eligible_service_categories.includes(serviceCategory)) {
    return true;
  }
  return false;
}

async function enqueueEligible(supabase: any, summary: DispatchSummary) {
  // Pull active rules per org
  const { data: rules } = await supabase
    .from("review_request_automation_rules")
    .select("*")
    .eq("is_active", true);
  if (!rules?.length) return;

  // Entitlement gate — only orgs with reputation_enabled=true may dispatch.
  // Source of truth = organization_feature_flags (synced by trigger from
  // reputation_subscriptions). Lapsed orgs MUST NOT continue blasting SMS.
  const orgIds = Array.from(new Set(rules.map((r: any) => r.organization_id)));
  const { data: flags } = await supabase
    .from("organization_feature_flags")
    .select("organization_id, is_enabled")
    .eq("flag_key", "reputation_enabled")
    .in("organization_id", orgIds);
  const entitled = new Set(
    (flags ?? []).filter((f: any) => f.is_enabled).map((f: any) => f.organization_id),
  );

  // Group entitled rules by org
  const byOrg = new Map<string, any[]>();
  for (const r of rules) {
    if (!entitled.has(r.organization_id)) continue;
    const list = byOrg.get(r.organization_id) ?? [];
    list.push(r);
    byOrg.set(r.organization_id, list);
  }

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Per-org enqueue cap per tick — protects margin once dozens of orgs are
  // active. Even if a backlog of completed appointments lands at once, each
  // org can only queue this many requests per cron run; the rest are picked
  // up next tick. Tunable via env without redeploy.
  const PER_ORG_TICK_CAP = Number(Deno.env.get("REPUTATION_PER_ORG_TICK_CAP") ?? "100");
  const enqueuePerOrg = new Map<string, number>();

  for (const [orgId, orgRules] of byOrg) {
    // Recent completed appointments for this org
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, organization_id, location_id, client_id, client_phone, client_email, service_category, service_name, status, end_time, appointment_date, updated_at")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .gte("updated_at", sinceIso)
      .limit(500);
    if (!appts?.length) continue;

    // ------------------------------------------------------------------
    // N+1 batch query: pre-load recent dispatches for ALL clients in one
    // shot, then look up frequency-cap hits in memory. Replaces the old
    // per-(appt, rule) head-count query that would issue 500×N round-trips
    // per org per tick.
    // ------------------------------------------------------------------
    const maxCapDays = Math.max(
      0,
      ...orgRules.map((r: any) => Number(r.frequency_cap_days ?? 0)),
    );
    const recentSentByClient = new Map<string, string[]>(); // clientId -> sent_at ISOs
    if (maxCapDays > 0) {
      const clientIds = Array.from(
        new Set(appts.map((a: any) => a.client_id).filter(Boolean)),
      ) as string[];
      if (clientIds.length) {
        const cutoffIso = new Date(
          Date.now() - maxCapDays * 86400 * 1000,
        ).toISOString();
        // Page through in chunks of 500 client_ids to stay within URL/IN limits.
        const chunkSize = 500;
        for (let i = 0; i < clientIds.length; i += chunkSize) {
          const chunk = clientIds.slice(i, i + chunkSize);
          const { data: recent } = await supabase
            .from("review_request_dispatch_queue")
            .select("client_id, sent_at")
            .eq("organization_id", orgId)
            .in("client_id", chunk)
            .not("sent_at", "is", null)
            .gte("sent_at", cutoffIso);
          for (const r of (recent ?? []) as any[]) {
            const list = recentSentByClient.get(r.client_id) ?? [];
            list.push(r.sent_at);
            recentSentByClient.set(r.client_id, list);
          }
        }
      }
    }

    let enqueuedThisOrg = 0;
    for (const appt of appts) {
      if (enqueuedThisOrg >= PER_ORG_TICK_CAP) break;
      for (const rule of orgRules) {
        if (enqueuedThisOrg >= PER_ORG_TICK_CAP) break;
        // Location filter
        if (rule.location_ids?.length && !rule.location_ids.includes(appt.location_id)) continue;
        // Service filter
        if (isExcluded(appt.service_category, appt.service_name, rule)) continue;

        // Frequency cap — in-memory check against pre-loaded recent dispatches.
        if (appt.client_id && rule.frequency_cap_days) {
          const ruleCutoff = Date.now() - rule.frequency_cap_days * 86400 * 1000;
          const sent = recentSentByClient.get(appt.client_id) ?? [];
          if (sent.some((iso) => new Date(iso).getTime() >= ruleCutoff)) continue;
        }

        const scheduledFor = new Date(
          new Date(`${appt.appointment_date}T${appt.end_time ?? "12:00:00"}`).getTime() +
            (rule.send_delay_minutes ?? 240) * 60 * 1000,
        ).toISOString();

        const { error } = await supabase
          .from("review_request_dispatch_queue")
          .insert({
            organization_id: orgId,
            appointment_id: appt.id,
            rule_id: rule.id,
            client_id: appt.client_id,
            client_phone: appt.client_phone,
            client_email: appt.client_email,
            channel: rule.channel === "email" ? "email" : "sms",
            scheduled_for: scheduledFor,
          });
        if (!error) {
          summary.enqueued++;
          enqueuedThisOrg++;
          // Track the synthetic "would-have-sent" against the cap so multiple
          // rules for the same client in the same tick don't all enqueue.
          if (appt.client_id) {
            const list = recentSentByClient.get(appt.client_id) ?? [];
            list.push(new Date().toISOString());
            recentSentByClient.set(appt.client_id, list);
          }
        }
        // Unique violation = already queued; ignore silently.
      }
    }
    if (enqueuedThisOrg > 0) enqueuePerOrg.set(orgId, enqueuedThisOrg);
  }

  // Fairness telemetry — emit even when zero enqueues so platform staff
  // can correlate ticks. cappedOrgs = orgs that hit PER_ORG_TICK_CAP this run.
  const enqueueCounts = [...enqueuePerOrg.values()];
  summary.enqueueFairness = {
    orgsServed: enqueuePerOrg.size,
    maxPerOrg: enqueueCounts.length ? Math.max(...enqueueCounts) : 0,
    cappedOrgs: enqueueCounts.filter((n) => n >= PER_ORG_TICK_CAP).length,
  };
}

const MAX_ATTEMPTS = 5;

async function handleFailure(
  supabase: any,
  row: any,
  errorMessage: string,
  summary: DispatchSummary,
) {
  const nextAttempts = (row.attempts ?? 0) + 1;
  // Exponential backoff: 5min * 2^(attempts-1) — 5m, 10m, 20m, 40m, then park at 5.
  const backoffMin = 5 * Math.pow(2, nextAttempts - 1);
  const nextRetry = new Date(Date.now() + backoffMin * 60 * 1000).toISOString();
  const isParked = nextAttempts >= MAX_ATTEMPTS;
  const nowIso = new Date().toISOString();

  await supabase.from("review_request_dispatch_queue").update({
    attempts: nextAttempts,
    last_error: errorMessage,
    next_retry_at: isParked ? null : nextRetry,
    parked_at: isParked ? nowIso : null,
  }).eq("id", row.id);

  if (isParked) {
    // Immutable compliance log entry — operators can audit parked rows.
    await supabase.from("review_compliance_log").insert({
      organization_id: row.organization_id,
      event_type: "request_parked",
      payload: {
        appointment_id: row.appointment_id,
        attempts: nextAttempts,
        last_error: errorMessage,
        channel: row.channel,
      },
    });
  }
  summary.errors++;
}

async function sendDue(supabase: any, summary: DispatchSummary) {
  const nowIso = new Date().toISOString();
  // Per-org SEND cap mirrors the enqueue cap so one org's backlog cannot
  // starve the rest of the fleet of dispatches in the same tick. Tunable
  // via env without redeploy. Defaults to 50 (more conservative than
  // enqueue, since each send hits Twilio).
  const PER_ORG_SEND_CAP = Number(Deno.env.get("REPUTATION_PER_ORG_SEND_CAP") ?? "50");
  // Global send budget per tick. We pull a larger pool than we'll send so
  // we can fairness-allocate in memory; un-served rows stay queued for the
  // next tick (next_retry_at unchanged).
  const GLOBAL_SEND_POOL = Number(Deno.env.get("REPUTATION_GLOBAL_SEND_POOL") ?? "1000");
  const GLOBAL_SEND_CAP = Number(Deno.env.get("REPUTATION_GLOBAL_SEND_CAP") ?? "200");

  // Pull due rows: scheduled, not sent, not skipped, attempts under cap (5),
  // and either never retried or past their next_retry_at.
  const { data: due } = await supabase
    .from("review_request_dispatch_queue")
    .select("*")
    .lte("scheduled_for", nowIso)
    .is("sent_at", null)
    .is("skipped_at", null)
    .lt("attempts", 5)
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order("scheduled_for", { ascending: true })
    .limit(GLOBAL_SEND_POOL);
  if (!due?.length) return;

  // Round-robin fairness: bucket due rows by org (preserving scheduled_for
  // order within each), then interleave so every org gets a turn before any
  // single org consumes its full PER_ORG_SEND_CAP.
  const buckets = new Map<string, any[]>();
  for (const row of due) {
    const list = buckets.get(row.organization_id) ?? [];
    list.push(row);
    buckets.set(row.organization_id, list);
  }
  const orderedDue: any[] = [];
  const sentPerOrg = new Map<string, number>();
  let exhausted = false;
  while (!exhausted && orderedDue.length < GLOBAL_SEND_CAP) {
    exhausted = true;
    for (const [orgId, list] of buckets) {
      if (orderedDue.length >= GLOBAL_SEND_CAP) break;
      const usedByOrg = sentPerOrg.get(orgId) ?? 0;
      if (usedByOrg >= PER_ORG_SEND_CAP) continue;
      const next = list.shift();
      if (!next) continue;
      orderedDue.push(next);
      sentPerOrg.set(orgId, usedByOrg + 1);
      exhausted = false;
    }
  }

  // Fairness telemetry — see DispatchSummary.sendFairness. cappedOrgs counts
  // orgs whose due-pool exceeded PER_ORG_SEND_CAP (i.e. they had more queued
  // sends than they were allowed this tick: leftover rows in `buckets`). If
  // cappedOrgs trends > 0 tick-over-tick, raise PER_ORG_SEND_CAP /
  // GLOBAL_SEND_POOL or shorten the cron interval.
  const sendCounts = [...sentPerOrg.values()];
  let cappedOrgsCount = 0;
  for (const [orgId, leftover] of buckets) {
    if (leftover.length > 0 && (sentPerOrg.get(orgId) ?? 0) >= PER_ORG_SEND_CAP) {
      cappedOrgsCount++;
    }
  }
  summary.sendFairness = {
    orgsServed: sentPerOrg.size,
    maxPerOrg: sendCounts.length ? Math.max(...sendCounts) : 0,
    cappedOrgs: cappedOrgsCount,
  };

  for (const row of orderedDue) {
    try {
      // Skip if no contact channel
      const phone = row.client_phone;
      if (row.channel !== "sms" || !phone) {
        await supabase.from("review_request_dispatch_queue").update({
          skipped_at: nowIso,
          skipped_reason: row.channel === "sms" ? "no_phone" : `channel_${row.channel}_unsupported`,
        }).eq("id", row.id);
        summary.skipped++;
        continue;
      }

      // Opt-out gate — never re-contact a phone that replied STOP.
      const { data: optOut } = await supabase
        .from("sms_opt_outs")
        .select("id")
        .eq("organization_id", row.organization_id)
        .eq("phone", phone)
        .maybeSingle();
      if (optOut) {
        await supabase.from("review_request_dispatch_queue").update({
          skipped_at: nowIso,
          skipped_reason: "sms_opted_out",
        }).eq("id", row.id);
        summary.skipped++;
        continue;
      }

      // Lookup org name + appointment client name for template
      const [{ data: org }, { data: appt }] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", row.organization_id).single(),
        supabase.from("appointments").select("client_name, client_id").eq("id", row.appointment_id).single(),
      ]);

      // Lookup or auto-create the org's default survey. Reputation Engine
      // doctrine: dispatcher is the source of truth for review requests, so
      // missing survey config must NOT silently block sends — bootstrap one.
      let { data: survey } = await supabase
        .from("client_feedback_surveys")
        .select("id")
        .eq("organization_id", row.organization_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!survey) {
        const { data: created, error: createErr } = await supabase
          .from("client_feedback_surveys")
          .insert({
            organization_id: row.organization_id,
            name: "Default Post-Appointment Feedback",
            description: "Auto-created by Reputation Engine dispatcher.",
            trigger_type: "post_appointment",
            is_active: true,
          })
          .select("id")
          .single();
        if (createErr) {
          await supabase.from("review_request_dispatch_queue").update({
            attempts: row.attempts + 1, last_error: `survey_create_failed: ${createErr.message}`,
          }).eq("id", row.id);
          summary.errors++;
          continue;
        }
        survey = created;
      }

      const token = crypto.randomUUID().replace(/-/g, "");
      const { data: response, error: respErr } = await supabase
        .from("client_feedback_responses")
        .insert({
          organization_id: row.organization_id,
          survey_id: survey.id,
          appointment_id: row.appointment_id,
          client_id: row.client_id,
          token,
          expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (respErr) throw respErr;

      const firstName = (appt?.client_name ?? "there").split(" ")[0];
      const feedbackUrl = `${PUBLIC_FEEDBACK_BASE}?token=${token}`;

      const result = await sendSms(supabase, {
        to: phone,
        templateKey: "review_request_default",
        variables: {
          client_first_name: firstName,
          business_name: org?.name ?? "our salon",
          feedback_url: feedbackUrl,
        },
      }, row.organization_id);

      if (result.success) {
        await supabase.from("review_request_dispatch_queue").update({
          sent_at: nowIso,
          survey_response_id: response.id,
          attempts: row.attempts + 1,
        }).eq("id", row.id);
        await supabase.from("review_compliance_log").insert({
          organization_id: row.organization_id,
          event_type: "review_request_sent",
          feedback_response_id: response.id,
          payload: { channel: "sms", template: "review_request_default" },
        });
        summary.sent++;
      } else {
        await handleFailure(supabase, row, result.error ?? "unknown", summary);
      }
    } catch (e: any) {
      await handleFailure(supabase, row, e?.message ?? String(e), summary);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const summary: DispatchSummary = { enqueued: 0, sent: 0, skipped: 0, errors: 0 };

  try {
    const guard = await checkReputationKillSwitch("dispatch_disabled", supabase);
    if (guard.blocked) {
      console.log("[dispatch-review-requests] skipped:", guard.reason, guard.message);
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: guard.reason, message: guard.message, ...summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    await enqueueEligible(supabase, summary);
    await sendDue(supabase, summary);
    // Structured tick log for platform observability — greppable with
    // `[dispatch-review-requests] tick` in edge-fn logs. cappedOrgs > 0 on
    // either pass = signal to raise PER_ORG_*_CAP / GLOBAL_SEND_POOL or
    // shorten the cron interval.
    console.log("[dispatch-review-requests] tick:", JSON.stringify({
      enqueued: summary.enqueued,
      sent: summary.sent,
      skipped: summary.skipped,
      errors: summary.errors,
      enqueueFairness: summary.enqueueFairness,
      sendFairness: summary.sendFairness,
    }));
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[dispatch-review-requests] fatal:", e?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "unknown", ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
