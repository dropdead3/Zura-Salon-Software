// AI Weekly Feedback Summary — "3 things to fix this week from feedback".
// Operator-approved only. Returns a structured summary; the operator chooses
// whether to act. Never auto-publishes, never auto-creates tasks.
//
// Doctrine alignment:
//   - AI is prohibited from determining business eligibility/priorities; this
//     function returns a *draft* of patterns observed, anchored to actual
//     low-rated responses. The operator confirms or discards.
//   - Operator-approved AI surface (Reputation Engine memory).
//   - Logs ai_feedback_summary_generated to immutable review_compliance_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    if (!organizationId) return json({ error: "organizationId required" }, 400);

    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id, _org_id: organizationId,
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    // Pull this week's responses (cap to 200 to bound prompt size)
    const { data: responses } = await supabase
      .from("client_feedback_responses")
      .select("overall_rating, nps_score, comments, appointment_id, responded_at")
      .eq("organization_id", organizationId)
      .gte("responded_at", since)
      .not("responded_at", "is", null)
      .order("responded_at", { ascending: false })
      .limit(200);

    const total = responses?.length ?? 0;
    if (total < 5) {
      // Signal preservation: don't ask AI to invent a summary on thin data.
      return json({
        summary: null,
        responseCount: total,
        message: "Not enough feedback responses this week to summarize (minimum 5).",
      });
    }

    // Compose context — focus on negative + neutral signals
    const negatives = (responses ?? []).filter(
      (r) => (r.overall_rating != null && r.overall_rating <= 3) ||
             (r.nps_score != null && r.nps_score <= 6),
    );

    const apptIds = Array.from(new Set(
      (responses ?? []).map((r) => r.appointment_id).filter(Boolean) as string[],
    ));
    const apptMap = new Map<string, string>();
    if (apptIds.length) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, service_name")
        .in("id", apptIds);
      for (const a of appts ?? []) apptMap.set(a.id, a.service_name || "Unspecified");
    }

    const negativeExcerpts = negatives.slice(0, 30).map((r) => {
      const svc = apptMap.get(r.appointment_id || "") || "Unspecified";
      const rating = r.overall_rating ?? "—";
      const nps = r.nps_score ?? "—";
      const comment = (r.comments || "").slice(0, 280);
      return `[${svc}] rating ${rating}/5 nps ${nps} — ${comment || "(no comment)"}`;
    }).join("\n");

    const avgRating = (responses ?? [])
      .map((r) => r.overall_rating).filter((v): v is number => v != null);
    const avg = avgRating.length ? (avgRating.reduce((s, v) => s + v, 0) / avgRating.length).toFixed(2) : "—";

    const systemPrompt = [
      "You are an analyst surfacing operational patterns from salon client feedback.",
      "Output JSON only — no preamble, no markdown, no code fences.",
      "Schema: { fixes: [{ title: string, evidence: string, suggestedAction: string }] }",
      "Return EXACTLY 3 fixes if patterns exist, or fewer if signal is weak.",
      "Each fix must be grounded in the provided excerpts — quote a phrase if possible.",
      "Never recommend hiring, firing, pricing, or compensation changes.",
      "Never invent metrics not in the data.",
      "If no clear pattern emerges, return { fixes: [] }.",
    ].join(" ");

    const userPrompt = [
      `Week summary: ${total} responses, ${negatives.length} negative, avg rating ${avg}/5.`,
      "",
      "Negative & neutral excerpts:",
      negativeExcerpts || "(none)",
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited, try again shortly." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiData = await aiResp.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { fixes?: Array<{ title: string; evidence: string; suggestedAction: string }> } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { fixes: [] }; }
    const fixes = Array.isArray(parsed.fixes) ? parsed.fixes.slice(0, 3) : [];

    await supabase.from("review_compliance_log").insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      event_type: "ai_feedback_summary_generated",
      payload: { responseCount: total, negativeCount: negatives.length, fixCount: fixes.length },
    });

    return json({
      summary: { fixes },
      responseCount: total,
      negativeCount: negatives.length,
      avgRating: avg,
    });
  } catch (e) {
    console.error("ai-feedback-weekly-summary error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
