// AI Feedback Theme Tagger — Clusters negative feedback (rating <= 3 OR
// NPS <= 6) by root-cause theme (e.g., "front desk wait", "color tone",
// "blow-dry quality"). Operator-approved surface; nothing auto-acted.
//
// Doctrine alignment:
//   - AI is prohibited from determining business eligibility/priorities;
//     this returns ranked themes grounded in operator-owned data. Operator
//     confirms or dismisses each cluster.
//   - Returns silence (empty clusters[]) when signal is too thin (<5 negatives).
//   - Persists snapshot + clusters under the calling org's RLS scope.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_NEGATIVES = 5;
const MAX_EXCERPTS = 80;
const DEFAULT_MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const organizationId = body?.organizationId as string | undefined;
    const windowDays = Math.max(7, Math.min(365, Number(body?.windowDays) || 90));
    if (!organizationId) return json({ error: "organizationId required" }, 400);

    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id, _org_id: organizationId,
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    // Entitlement gate: AI theme tagger is part of Zura Reputation.
    // Source of truth = `reputation_enabled` flag (synced by trigger from
    // `reputation_subscriptions`). Prevents bypass via direct function call.
    const { data: flag } = await supabase
      .from("organization_feature_flags")
      .select("is_enabled")
      .eq("organization_id", organizationId)
      .eq("flag_key", "reputation_enabled")
      .maybeSingle();
    if (!flag?.is_enabled) {
      return json({ error: "Zura Reputation subscription required" }, 402);
    }

    const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

    const { data: responses } = await supabase
      .from("client_feedback_responses")
      .select("id, overall_rating, nps_score, comments, appointment_id, responded_at")
      .eq("organization_id", organizationId)
      .gte("responded_at", since)
      .not("responded_at", "is", null)
      .order("responded_at", { ascending: false })
      .limit(800);

    const total = responses?.length ?? 0;
    const negatives = (responses ?? []).filter(
      (r) =>
        ((r.overall_rating != null && r.overall_rating <= 3) ||
          (r.nps_score != null && r.nps_score <= 6)) &&
        (r.comments || "").trim().length > 0,
    );

    if (negatives.length < MIN_NEGATIVES) {
      return json({
        snapshotId: null,
        clusters: [],
        responseCount: total,
        negativeCount: negatives.length,
        message: `Need at least ${MIN_NEGATIVES} negative responses with comments to detect themes.`,
      });
    }

    // Service map for context
    const apptIds = Array.from(new Set(
      negatives.map((r) => r.appointment_id).filter(Boolean) as string[],
    ));
    const apptMap = new Map<string, string>();
    if (apptIds.length) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, service_name")
        .in("id", apptIds);
      for (const a of appts ?? []) apptMap.set(a.id, a.service_name || "Unspecified");
    }

    const sample = negatives.slice(0, MAX_EXCERPTS);
    const excerpts = sample.map((r, i) => {
      const svc = apptMap.get(r.appointment_id || "") || "Unspecified";
      const rating = r.overall_rating ?? "—";
      const nps = r.nps_score ?? "—";
      const comment = (r.comments || "").slice(0, 320).replace(/\s+/g, " ");
      return `#${i} id=${r.id} [${svc}] rating ${rating}/5 nps ${nps} — ${comment}`;
    }).join("\n");

    const systemPrompt = [
      "You are an operations analyst clustering salon client complaints by root cause.",
      "Identify recurring THEMES across the excerpts (e.g., 'front desk wait', 'color tone mismatch', 'rushed blow-dry', 'pricing surprise').",
      "Output ONLY a tool call — no preamble.",
      "Each theme must reference the # ids of supporting excerpts.",
      "Suggested actions must be operational (scheduling, training, comms, pricing display) — never hiring/firing/promotions.",
      "If no clear pattern (>=2 supporting excerpts), omit it. Return at most 6 themes.",
    ].join(" ");

    const userPrompt = [
      `Window: last ${windowDays} days. Total responses: ${total}. Negatives with comments: ${negatives.length}.`,
      "",
      "Negative excerpts:",
      excerpts,
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_themes",
            description: "Report root-cause themes detected across negative client feedback.",
            parameters: {
              type: "object",
              properties: {
                themes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", description: "Short theme name, max 60 chars (e.g., 'Front desk wait time')" },
                      category: {
                        type: "string",
                        enum: ["scheduling", "service_quality", "communication", "facility", "pricing", "front_desk", "product", "other"],
                      },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      suggested_action: { type: "string", description: "One concrete operational step the operator can take." },
                      evidence_quote: { type: "string", description: "A short verbatim phrase (<=140 chars) from the excerpts illustrating the theme." },
                      supporting_indices: {
                        type: "array",
                        items: { type: "integer" },
                        description: "The # ids of supporting excerpts. Must contain at least 2.",
                      },
                    },
                    required: ["label", "category", "severity", "suggested_action", "evidence_quote", "supporting_indices"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["themes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_themes" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limits exceeded, please try again later." }, 429);
      if (aiResp.status === 402) return json({ error: "Lovable AI credits exhausted." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let themes: any[] = [];
    try {
      themes = JSON.parse(toolCall?.function?.arguments || "{}")?.themes ?? [];
    } catch (e) {
      console.error("Failed to parse tool args:", e);
    }

    // Persist snapshot
    const { data: snapshot, error: snapErr } = await supabase
      .from("feedback_theme_snapshots")
      .insert({
        organization_id: organizationId,
        generated_by: user.id,
        window_days: windowDays,
        response_count: total,
        negative_count: negatives.length,
        model: DEFAULT_MODEL,
        status: "complete",
      })
      .select("id")
      .single();

    if (snapErr || !snapshot) {
      console.error("Snapshot insert failed:", snapErr);
      return json({ error: "Failed to persist snapshot" }, 500);
    }

    const negativeCount = negatives.length;
    const clusterRows = themes
      .filter((t: any) => Array.isArray(t.supporting_indices) && t.supporting_indices.length >= 2)
      .slice(0, 6)
      .map((t: any, idx: number) => {
        const ids = (t.supporting_indices as number[])
          .map((i) => sample[i]?.id)
          .filter(Boolean) as string[];
        return {
          snapshot_id: snapshot.id,
          organization_id: organizationId,
          theme_label: String(t.label).slice(0, 80),
          category: String(t.category || "other"),
          severity: ["low", "medium", "high"].includes(t.severity) ? t.severity : "medium",
          response_count: ids.length,
          share_of_negative: negativeCount > 0 ? Number((ids.length / negativeCount).toFixed(4)) : null,
          suggested_action: String(t.suggested_action || "").slice(0, 500),
          evidence_quote: String(t.evidence_quote || "").slice(0, 200),
          sample_response_ids: ids.slice(0, 10),
          rank: idx + 1,
          status: "open",
        };
      })
      .filter((r: any) => r.sample_response_ids.length >= 2);

    if (clusterRows.length) {
      const { error: cErr } = await supabase
        .from("feedback_theme_clusters")
        .insert(clusterRows);
      if (cErr) console.error("Cluster insert failed:", cErr);
    }

    return json({
      snapshotId: snapshot.id,
      clusters: clusterRows,
      responseCount: total,
      negativeCount,
    });
  } catch (e) {
    console.error("ai-feedback-theme-tagger error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
