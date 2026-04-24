import { createClient } from "@supabase/supabase-js";

interface ZuraPersonality {
  display_name: string;
  tone: string;
  formality_level: number;
  emoji_usage: boolean;
  custom_greeting: string | null;
  custom_sign_off: string | null;
  brand_voice_notes: string | null;
  prohibited_phrases: string[];
  encouraged_phrases: string[];
  response_length_preference: string;
}

interface ZuraKnowledgeEntry {
  title: string;
  content: string;
  category: string;
  priority: number;
}

interface ZuraRoleRule {
  target_role: string;
  tone_override: string | null;
  custom_instructions: string | null;
  data_boundaries: string | null;
  suggested_cta_style: string | null;
}

interface ZuraGuardrail {
  rule_type: string;
  rule_description: string;
  severity: string;
}

export interface ZuraConfig {
  personality: ZuraPersonality | null;
  knowledge: ZuraKnowledgeEntry[];
  roleRules: ZuraRoleRule | null;
  guardrails: ZuraGuardrail[];
}

// Rough token estimator (~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function loadZuraConfig(
  supabaseUrl: string,
  serviceRoleKey: string,
  organizationId: string | null,
  functionName: string,
  userRole?: string | null,
): Promise<ZuraConfig> {
  const result: ZuraConfig = {
    personality: null,
    knowledge: [],
    roleRules: null,
    guardrails: [],
  };

  if (!organizationId) return result;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch all config in parallel
    const [personalityRes, knowledgeRes, guardrailsRes, roleRulesRes] = await Promise.all([
      supabase
        .from("zura_personality_config")
        .select("*")
        .eq("organization_id", organizationId)
        .single(),

      supabase
        .from("zura_knowledge_entries")
        .select("title, content, category, priority")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .or(`applies_to_functions.cs.{${functionName}},applies_to_functions.cs.{all}`)
        .order("priority", { ascending: false })
        .limit(15),

      supabase
        .from("zura_guardrails")
        .select("rule_type, rule_description, severity")
        .eq("organization_id", organizationId)
        .eq("is_active", true),

      userRole
        ? supabase
            .from("zura_role_rules")
            .select("target_role, tone_override, custom_instructions, data_boundaries, suggested_cta_style")
            .eq("organization_id", organizationId)
            .eq("target_role", userRole)
            .eq("is_active", true)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (personalityRes.data) result.personality = personalityRes.data;
    if (knowledgeRes.data) result.knowledge = knowledgeRes.data;
    if (guardrailsRes.data) result.guardrails = guardrailsRes.data;
    if (roleRulesRes.data) result.roleRules = roleRulesRes.data;
  } catch (e: any) {
    console.error("Error loading AI config:", e);
    // Return defaults on error - functions continue working
  }

  return result;
}

export function buildZuraPromptPrefix(config: ZuraConfig): string {
  const sections: string[] = [];

  // Personality
  if (config.personality) {
    const p = config.personality;
    const personalityLines = [
      `PERSONALITY CONFIGURATION:`,
      `- Name: ${p.display_name}`,
      `- Tone: ${p.tone} (formality: ${p.formality_level}/5)`,
      `- Response length: ${p.response_length_preference}`,
    ];
    if (p.custom_greeting) personalityLines.push(`- Greeting style: "${p.custom_greeting}"`);
    if (p.custom_sign_off) personalityLines.push(`- Sign-off style: "${p.custom_sign_off}"`);
    if (p.brand_voice_notes) personalityLines.push(`- Brand voice: ${p.brand_voice_notes}`);
    if (p.prohibited_phrases?.length) personalityLines.push(`- NEVER use these phrases: ${p.prohibited_phrases.join(", ")}`);
    if (p.encouraged_phrases?.length) personalityLines.push(`- Prefer these phrases: ${p.encouraged_phrases.join(", ")}`);
    personalityLines.push(p.emoji_usage ? "- You may use emojis sparingly." : "- Do NOT use emojis.");
    sections.push(personalityLines.join("\n"));
  }

  // Knowledge (with token budget)
  if (config.knowledge.length > 0) {
    const knowledgeLines = ["BUSINESS KNOWLEDGE:"];
    let tokenBudget = 1500;
    for (const entry of config.knowledge) {
      const entryText = `[${entry.category.toUpperCase()}] ${entry.title}: ${entry.content}`;
      const cost = estimateTokens(entryText);
      if (cost > tokenBudget) break;
      tokenBudget -= cost;
      knowledgeLines.push(entryText);
    }
    sections.push(knowledgeLines.join("\n"));
  }

  // Role rules
  if (config.roleRules) {
    const r = config.roleRules;
    const roleLines = [`ROLE-SPECIFIC INSTRUCTIONS (for ${r.target_role}):`];
    if (r.tone_override) roleLines.push(`- Tone override: ${r.tone_override}`);
    if (r.custom_instructions) roleLines.push(r.custom_instructions);
    if (r.data_boundaries) roleLines.push(`DATA BOUNDARIES: ${r.data_boundaries}`);
    if (r.suggested_cta_style) roleLines.push(`CTA STYLE: ${r.suggested_cta_style}`);
    sections.push(roleLines.join("\n"));
  }

  // Guardrails
  if (config.guardrails.length > 0) {
    const hardBlocks = config.guardrails.filter((g: any) => g.severity === "hard_block");
    const softWarns = config.guardrails.filter((g: any) => g.severity === "soft_warn");

    if (hardBlocks.length > 0) {
      sections.push("ABSOLUTE RULES (never violate):\n" + hardBlocks.map((g: any) => `- ${g.rule_description}`).join("\n"));
    }
    if (softWarns.length > 0) {
      sections.push("GUIDELINES (politely deflect if asked):\n" + softWarns.map((g: any) => `- ${g.rule_description}`).join("\n"));
    }
  }

  if (sections.length === 0) return "";
  return sections.join("\n\n") + "\n\n--- CORE INSTRUCTIONS ---\n";
}
