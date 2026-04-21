/**
 * Wizard tokenization helper (Wave 13H — B3).
 *
 * Centralizes brand-token replacement so any registry-driven copy
 * (titles, descriptions, conflict explanations) renders consistently.
 *
 * Adding a new token here applies it everywhere the wizard reads strings
 * from the registry — no scattered `.replace()` calls in components.
 */

const TOKENS: Record<string, string> = {
  "{{PLATFORM_NAME}}": "Zura",
  "{{PLATFORM_NAME_FULL}}": "Zura Platform",
  "{{PLATFORM_DESCRIPTOR}}": "Guided Intelligence for Scaling Operators",
  "{{PLATFORM_CATEGORY}}": "Salon Intelligence Platform",
  "{{AI_ASSISTANT_NAME_DEFAULT}}": "Zura",
  "{{EXECUTIVE_BRIEF_NAME}}": "Zura Weekly Intelligence Brief",
  "{{MARKETING_OS_NAME}}": "Zura Marketing OS",
  "{{SIMULATION_ENGINE_NAME}}": "Zura Simulation Engine",
  "{{AUTOMATION_LAYER_NAME}}": "Zura Automation",
};

/**
 * Replace every `{{TOKEN}}` in a string with its resolved brand value.
 * Unknown tokens are left intact (visible bug → easy to spot in dev).
 */
export function tokenize(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;
  for (const [token, value] of Object.entries(TOKENS)) {
    if (out.includes(token)) {
      out = out.split(token).join(value);
    }
  }
  return out;
}
