import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConflictRule, DetectedConflict } from "@/components/onboarding/setup/types";

/**
 * useConflictRules — load all declarative conflict rules.
 */
export function useConflictRules() {
  return useQuery({
    queryKey: ["setup-conflict-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setup_conflict_rules" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as ConflictRule[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Lightweight, pure rule evaluator. Reads draftData (a flat map of
 * stepKey → step data) and returns triggered conflicts.
 *
 * Supported condition grammar:
 *   { "and": [ {leaf}, {leaf}, ... ] }
 *   leaf path examples:
 *     {"team.has_booth_renters": true}
 *     {"compensation.models": {"contains": "level_based"}}
 *     {"footprint.location_count": {"gte": 2}}
 *     {"standards.tip_distribution_rule": null}
 */
export function detectConflicts(
  rules: ConflictRule[],
  draftData: Record<string, Record<string, unknown> | undefined>,
): DetectedConflict[] {
  const flat: Record<string, unknown> = {};
  // Flatten with stepShortName.fieldName keys (e.g. team.has_booth_renters)
  const SHORT: Record<string, string> = {
    step_1_identity: "identity",
    step_2_footprint: "footprint",
    step_3_team: "team",
    step_4_compensation: "compensation",
    step_5_catalog: "catalog",
    step_6_standards: "standards",
    step_7_intent: "intent_meta",
  };
  for (const [stepKey, stepData] of Object.entries(draftData)) {
    if (!stepData) continue;
    const short = SHORT[stepKey] ?? stepKey;
    for (const [field, value] of Object.entries(stepData)) {
      flat[`${short}.${field}`] = value;
    }
    // Also flatten intent as a top-level array
    if (stepKey === "step_7_intent" && Array.isArray((stepData as any).intent)) {
      flat["intent"] = (stepData as any).intent;
    }
  }

  const evalLeaf = (path: string, expected: unknown): boolean => {
    const actual = flat[path];
    if (expected === null) return actual == null;
    if (typeof expected === "object" && expected !== null) {
      const op = expected as Record<string, unknown>;
      if ("contains" in op) return Array.isArray(actual) && actual.includes(op.contains);
      if ("not_contains" in op)
        return !Array.isArray(actual) || !actual.includes(op.not_contains);
      if ("gte" in op) return typeof actual === "number" && actual >= (op.gte as number);
      if ("lte" in op) return typeof actual === "number" && actual <= (op.lte as number);
      if ("eq" in op) return actual === op.eq;
      return false;
    }
    return actual === expected;
  };

  const evalCondition = (cond: Record<string, unknown>): boolean => {
    if ("and" in cond && Array.isArray(cond.and)) {
      return (cond.and as Array<Record<string, unknown>>).every((leaf) => {
        const entries = Object.entries(leaf);
        if (entries.length !== 1) return evalCondition(leaf);
        const [path, expected] = entries[0];
        if (path === "and" || path === "or") return evalCondition(leaf);
        return evalLeaf(path, expected);
      });
    }
    if ("or" in cond && Array.isArray(cond.or)) {
      return (cond.or as Array<Record<string, unknown>>).some((leaf) => {
        const entries = Object.entries(leaf);
        if (entries.length !== 1) return evalCondition(leaf);
        const [path, expected] = entries[0];
        return evalLeaf(path, expected);
      });
    }
    // Single-leaf root condition
    const entries = Object.entries(cond);
    if (entries.length === 1) {
      const [path, expected] = entries[0];
      return evalLeaf(path, expected);
    }
    return false;
  };

  return rules
    .filter((rule) => {
      try {
        return evalCondition(rule.condition);
      } catch {
        return false;
      }
    })
    .map((rule) => ({
      rule_key: rule.key,
      severity: rule.severity,
      explanation: rule.explanation,
      suggested_resolution: rule.suggested_resolution,
      resolution_step: rule.resolution_step,
    }));
}
