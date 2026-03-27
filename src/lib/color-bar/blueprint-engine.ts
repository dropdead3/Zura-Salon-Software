/**
 * Blueprint Engine — Pure functions for Service Blueprinting.
 *
 * Maps blueprint steps into actionable data for SmartMixAssist,
 * AssistantDailyPrep, and Stylist Checklist surfaces.
 */

// ─── Step Types ──────────────────────────────────────

export const BLUEPRINT_STEP_TYPES = [
  'mix_step',
  'assistant_prep_step',
  'application_step',
  'processing_step',
  'rinse_step',
  'finish_step',
] as const;

export type BlueprintStepType = (typeof BLUEPRINT_STEP_TYPES)[number];

export const STEP_TYPE_LABELS: Record<BlueprintStepType, string> = {
  mix_step: 'Mix',
  assistant_prep_step: 'Assistant Prep',
  application_step: 'Application',
  processing_step: 'Processing',
  rinse_step: 'Rinse',
  finish_step: 'Finish',
};

export const STEP_TYPE_ICONS: Record<BlueprintStepType, string> = {
  mix_step: 'Beaker',
  assistant_prep_step: 'HandHelping',
  application_step: 'Paintbrush',
  processing_step: 'Timer',
  rinse_step: 'Droplets',
  finish_step: 'CheckCircle2',
};

// ─── Metadata Interfaces ────────────────────────────

export interface MixStepMetadata {
  product_id?: string;
  baseline_id?: string;
  target_weight_g?: number;
  ratio_guidance?: string;
  notes?: string;
}

export interface AssistantPrepStepMetadata {
  tasks: string[];
}

export interface ProcessingStepMetadata {
  recommended_minutes?: number;
  timer_enabled?: boolean;
}

export interface GenericStepMetadata {
  notes?: string;
}

export type StepMetadata =
  | MixStepMetadata
  | AssistantPrepStepMetadata
  | ProcessingStepMetadata
  | GenericStepMetadata;

// ─── BlueprintStep Interface ────────────────────────

export interface BlueprintStep {
  id: string;
  organization_id: string;
  service_id: string;
  position: number;
  step_type: BlueprintStepType;
  title: string;
  description: string | null;
  metadata: StepMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Pure Functions ─────────────────────────────────

/** Filter steps to only mix steps */
export function getBlueprintMixSteps(steps: BlueprintStep[]): BlueprintStep[] {
  return steps.filter((s) => s.step_type === 'mix_step');
}

/** Extract assistant prep tasks from all assistant_prep_step entries */
export function getBlueprintPrepTasks(steps: BlueprintStep[]): string[] {
  return steps
    .filter((s) => s.step_type === 'assistant_prep_step')
    .flatMap((s) => (s.metadata as AssistantPrepStepMetadata).tasks ?? []);
}

/** Sum recommended processing times across all processing steps */
export function getProcessingTime(steps: BlueprintStep[]): number {
  return steps
    .filter((s) => s.step_type === 'processing_step')
    .reduce((sum, s) => {
      const meta = s.metadata as ProcessingStepMetadata;
      return sum + (meta.recommended_minutes ?? 0);
    }, 0);
}

/** Get default metadata for a given step type */
export function getDefaultMetadata(stepType: BlueprintStepType): StepMetadata {
  switch (stepType) {
    case 'mix_step':
      return {} as MixStepMetadata;
    case 'assistant_prep_step':
      return { tasks: [] } as AssistantPrepStepMetadata;
    case 'processing_step':
      return { recommended_minutes: undefined, timer_enabled: false } as ProcessingStepMetadata;
    default:
      return {} as GenericStepMetadata;
  }
}

/** Validate step type */
export function isValidStepType(type: string): type is BlueprintStepType {
  return BLUEPRINT_STEP_TYPES.includes(type as BlueprintStepType);
}
