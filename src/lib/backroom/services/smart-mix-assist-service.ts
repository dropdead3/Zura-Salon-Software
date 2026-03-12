/**
 * SmartMixAssistService — Suggestion engine for starting formulas.
 *
 * Delegates formula resolution to the shared FormulaResolver.
 * Adds SmartMixAssist-specific gating (settings check).
 */

import { supabase } from '@/integrations/supabase/client';
import {
  resolveFormula,
  type ResolvedFormula,
  type SuggestionSource,
  type FormulaResolutionRequest,
  SOURCE_LABELS,
  computeRatio,
} from './formula-resolver';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';

// Re-export types for backward compatibility
export type { SuggestionSource, FormulaLine };
export type FormulaSuggestion = ResolvedFormula;

export interface SuggestionRequest extends FormulaResolutionRequest {}

export { SOURCE_LABELS, computeRatio };

// ─── Settings Check ─────────────────────────────────

export async function isSmartMixAssistEnabled(orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('smart_mix_assist_settings' as any)
    .select('is_enabled')
    .eq('organization_id', orgId)
    .maybeSingle();

  return (data as any)?.is_enabled === true;
}

export async function isRatioLockEnabled(orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('smart_mix_assist_settings' as any)
    .select('ratio_lock_enabled')
    .eq('organization_id', orgId)
    .maybeSingle();

  return (data as any)?.ratio_lock_enabled === true;
}

// ─── Main Entry Point ───────────────────────────────

export async function generateSuggestion(
  params: SuggestionRequest,
): Promise<FormulaSuggestion | null> {
  // Feature must be enabled
  const enabled = await isSmartMixAssistEnabled(params.organization_id);
  if (!enabled) return null;

  return resolveFormula(params);
}
