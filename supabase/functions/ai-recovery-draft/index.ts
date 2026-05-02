// AI-drafted recovery outreach. Operator-approved (never auto-sends).
// Returns a single draft message the operator can copy, edit, then send manually
// or via the Send Review Request flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  recoveryTaskId: string;
  channel?: "sms" | "email";
  tone?: "apologetic" | "professional" | "warm";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as ReqBody;
    if (!body?.recoveryTaskId) return json({ error: "recoveryTaskId required" }, 400);

    const channel = body.channel ?? "sms";
    const tone = body.tone ?? "apologetic";

    // Fetch recovery task + linked feedback (RLS-bypassed for service role; we filter
    // by org scope after via the user's membership).
    const { data: task, error: taskErr } = await supabase
      .from("recovery_tasks")
      .select(
        "id, organization_id, status, priority, resolution_notes, feedback_response_id, client_id, appointment_id",
      )
      .eq("id", body.recoveryTaskId)
      .maybeSingle();

    if (taskErr || !task) return json({ error: "Task not found" }, 404);

    // Verify org admin/manager
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id, _org_id: task.organization_id,
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { data: feedback } = await supabase
      .from("client_feedback_responses")
      .select("overall_rating, nps_score, comments, service_quality, staff_friendliness, cleanliness")
      .eq("id", task.feedback_response_id)
      .maybeSingle();

    let clientFirstName = "there";
    if (task.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("first_name")
        .eq("id", task.client_id)
        .maybeSingle();
      clientFirstName = client?.first_name || "there";
    }

    let serviceName: string | null = null;
    if (task.appointment_id) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("service_name")
        .eq("id", task.appointment_id)
        .maybeSingle();
      serviceName = appt?.service_name ?? null;
    }

    const channelInstr = channel === "sms"
      ? "Keep it under 320 characters (2 SMS segments max). No emojis. No links. Plain text only."
      : "Format for email: greeting, 1-2 short paragraphs, sign-off line. No subject line.";

    const toneInstr = {
      apologetic: "Lead with sincere apology. Acknowledge the specific issue. Offer to make it right.",
      professional: "Acknowledge the feedback respectfully. Offer a concrete next step.",
      warm: "Open warmly. Acknowledge concern personally. Invite a conversation.",
    }[tone];

    const systemPrompt = [
      "You draft client-recovery outreach messages for a salon owner.",
      "Output ONE message draft only — no preamble, no alternatives, no markdown.",
      toneInstr,
      channelInstr,
      "Never promise refunds or specific discounts unless the operator's notes mention them.",
      "Never imply automation; the operator will personally send this.",
    ].join(" ");

    const userPrompt = [
      `Client first name: ${clientFirstName}`,
      serviceName ? `Service: ${serviceName}` : null,
      feedback?.overall_rating != null ? `Overall rating: ${feedback.overall_rating}/5` : null,
      feedback?.nps_score != null ? `NPS: ${feedback.nps_score}/10` : null,
      feedback?.comments ? `Client wrote: "${feedback.comments}"` : null,
      task.resolution_notes ? `Operator notes so far: ${task.resolution_notes}` : null,
      `Priority: ${task.priority}`,
    ].filter(Boolean).join("\n");

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
    const draft = aiData?.choices?.[0]?.message?.content?.trim() ?? "";

    // Compliance log: drafted (not sent)
    await supabase.from("review_compliance_log").insert({
      organization_id: task.organization_id,
      actor_user_id: user.id,
      event_type: "recovery_draft_generated",
      feedback_response_id: task.feedback_response_id,
      recovery_task_id: task.id,
      payload: { channel, tone, length: draft.length },
    });

    return json({ draft, channel, tone });
  } catch (e) {
    console.error("ai-recovery-draft error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
