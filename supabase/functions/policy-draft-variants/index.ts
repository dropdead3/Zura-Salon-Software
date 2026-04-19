/**
 * policy-draft-variants (Wave 28.6)
 *
 * Generates a single tone variant of a policy from its structured rule blocks.
 * Strict guardrails:
 *   - Input is structured rules only (no free-text user input)
 *   - AI cannot mutate rule blocks; output is markdown for operator review
 *   - Approval flag stays false until operator explicitly approves in UI
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type VariantType = "internal" | "client" | "disclosure" | "manager_note";

const VARIANT_INSTRUCTIONS: Record<VariantType, string> = {
  internal:
    "Audience: salon staff. Tone: clear, operational, complete. Include all rules with exact thresholds, fees, and timelines exactly as configured. Use second person ('you'). Format: short headings + bullet points.",
  client:
    "Audience: clients booking services. Tone: warm, plain-language, no jargon. Cover the same rules but in friendly prose. Never invent exceptions or soften penalties. Format: 2-3 short paragraphs.",
  disclosure:
    "Audience: client at the moment of booking confirmation. Tone: concise, neutral, factual. ONE short paragraph (max 3 sentences) summarizing the rules they are agreeing to. No marketing copy.",
  manager_note:
    "Audience: managers handling exceptions. Tone: decisive, brief. Format: 'When X happens, do Y. Authority: [role].' Bullet points only. Surface override authority and escalation thresholds explicitly.",
};

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function buildPrompt(
  policyTitle: string,
  policyIntent: string | null,
  ruleBlocks: Array<{ block_key: string; value: unknown; required: boolean }>,
): string {
  const lines = [
    `Policy: ${policyTitle}`,
    policyIntent ? `Intent: ${policyIntent}` : "",
    "",
    "Configured rules (these are the ONLY rules that may appear in your output):",
  ];
  ruleBlocks.forEach((b) => {
    const v = b.value as { v?: unknown };
    const val = v && typeof v === "object" && "v" in v ? v.v : b.value;
    lines.push(`- ${b.block_key}: ${JSON.stringify(val)}${b.required ? " (required)" : ""}`);
  });
  return lines.filter(Boolean).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const versionId = body.versionId as string;
    const variantType = body.variantType as VariantType;
    if (!versionId || !variantType || !VARIANT_INSTRUCTIONS[variantType]) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load version + policy + blocks
    const { data: version, error: vErr } = await admin
      .from("policy_versions")
      .select("id, organization_id, policy_id")
      .eq("id", versionId)
      .single();
    if (vErr || !version) throw new Error("Version not found");

    // Authorization: only org admins may draft
    const { data: isAdmin } = await admin.rpc("is_org_admin", {
      _user_id: userId,
      _organization_id: version.organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: policy } = await admin
      .from("policies")
      .select("internal_title, intent")
      .eq("id", version.policy_id)
      .single();

    const { data: blocks } = await admin
      .from("policy_rule_blocks")
      .select("block_key, value, required")
      .eq("version_id", versionId)
      .order("ordering", { ascending: true });

    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No rules configured. Configure rules first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Required-rule guard
    const missingRequired = blocks.filter((b) => {
      if (!b.required) return false;
      const v = b.value as { v?: unknown };
      const val = v && typeof v === "object" && "v" in v ? v.v : b.value;
      return val === null || val === "" || val === undefined;
    });
    if (missingRequired.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Required rules not configured: ${missingRequired.map((b) => b.block_key).join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPrompt = buildPrompt(
      policy?.internal_title ?? "Policy",
      policy?.intent ?? null,
      blocks,
    );
    const promptHash = hashString(userPrompt + variantType);

    // Insert queued job
    const { data: job, error: jobErr } = await admin
      .from("policy_draft_jobs")
      .insert({
        organization_id: version.organization_id,
        version_id: versionId,
        variant_type: variantType,
        status: "running",
        model: "google/gemini-2.5-pro",
        prompt_hash: promptHash,
        created_by: userId,
      })
      .select()
      .single();
    if (jobErr || !job) throw new Error("Failed to create job");

    const systemPrompt =
      "You are a policy renderer. Render the configured rules in the requested voice. " +
      "STRICT RULES:\n" +
      "1. Use ONLY the rules listed in the user message. Do NOT invent fees, timelines, exceptions, or eligibility criteria.\n" +
      "2. Do NOT add disclaimers, caveats, or legal language not implied by the configured rules.\n" +
      "3. If a rule is missing, do NOT mention that topic at all.\n" +
      "4. Output clean markdown. No preamble, no 'Here is your policy', no closing remarks.\n\n" +
      "Voice instructions:\n" +
      VARIANT_INSTRUCTIONS[variantType];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status;
      await admin
        .from("policy_draft_jobs")
        .update({ status: "failed", error: `AI gateway ${status}: ${errText.slice(0, 500)}` })
        .eq("id", job.id);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway error ${status}`);
    }

    const aiJson = await aiResp.json();
    const outputMd: string = aiJson.choices?.[0]?.message?.content ?? "";

    if (!outputMd.trim()) {
      await admin
        .from("policy_draft_jobs")
        .update({ status: "failed", error: "Empty AI response" })
        .eq("id", job.id);
      throw new Error("AI returned empty content");
    }

    // Mark job succeeded
    await admin
      .from("policy_draft_jobs")
      .update({ status: "succeeded", output_md: outputMd })
      .eq("id", job.id);

    // Upsert into policy_variants — unapproved by default
    const { data: existingVariant } = await admin
      .from("policy_variants")
      .select("id")
      .eq("version_id", versionId)
      .eq("variant_type", variantType)
      .maybeSingle();

    if (existingVariant) {
      await admin
        .from("policy_variants")
        .update({
          body_md: outputMd,
          ai_generated: true,
          ai_model: "google/gemini-2.5-pro",
          last_drafted_at: new Date().toISOString(),
          approved: false,
          approved_at: null,
          approved_by: null,
        })
        .eq("id", existingVariant.id);
    } else {
      await admin.from("policy_variants").insert({
        organization_id: version.organization_id,
        version_id: versionId,
        variant_type: variantType,
        body_md: outputMd,
        ai_generated: true,
        ai_model: "google/gemini-2.5-pro",
        last_drafted_at: new Date().toISOString(),
        approved: false,
      });
    }

    return new Response(
      JSON.stringify({ success: true, jobId: job.id, output_md: outputMd }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("policy-draft-variants error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
