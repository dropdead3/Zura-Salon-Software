/**
 * Setup wizard shared types.
 */

export interface StepRegistryEntry {
  id: string;
  key: string;
  title: string;
  step_order: number;
  required: boolean;
  applies_when: Record<string, unknown> | null;
  depends_on: string[];
  unlocks: string[];
  component_key: string;
  commit_handler: string | null;
  step_version: number;
  deprecated_at: string | null;
}

export interface ConflictRule {
  id: string;
  key: string;
  severity: "block" | "warn" | "inform";
  trigger_steps: string[];
  condition: Record<string, unknown>;
  explanation: string;
  suggested_resolution: string | null;
  resolution_step: string | null;
}

export interface DetectedConflict {
  rule_key: string;
  severity: "block" | "warn" | "inform";
  explanation: string;
  suggested_resolution: string | null;
  resolution_step: string | null;
}

export interface StepProps<TData = Record<string, unknown>> {
  orgId: string;
  stepKey: string;
  initialData: TData | null;
  draftData: Record<string, unknown>;
  onChange: (data: TData) => void;
  onValidityChange: (valid: boolean) => void;
}

/** Map of which downstream surfaces a step unlocks — drives the side panel */
export const STEP_UNLOCK_CONSEQUENCES: Record<string, string> = {
  step_1_identity: "Branding, timezone, and your dashboard clock.",
  step_2_footprint: "Cross-location benchmarking and operational scope.",
  step_3_team: "Career pathway, stylist levels, and team intelligence.",
  step_4_compensation: "Payroll engine and commission breach detection.",
  step_5_catalog: "Service catalog and Color Bar eligibility.",
  step_6_standards: "Policy engine and tip distribution.",
  step_7_intent: "Sidebar persona and recommendation engine.",
  step_7_5_apps: "Pre-installed apps tailored to your operation.",
};
