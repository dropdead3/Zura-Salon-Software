/**
 * FormulaService — Sole owner of client_formula_history writes.
 *
 * Formula history should only be created from finalized session data,
 * not raw UI drafts. Hooks call this service; UI does not write directly.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';

export interface SaveFormulaParams {
  organization_id: string;
  client_id: string;
  appointment_id?: string;
  appointment_service_id?: string;
  mix_session_id?: string;
  service_name?: string;
  formula_type: 'actual' | 'refined';
  formula_data: FormulaLine[];
  staff_id?: string;
  staff_name?: string;
  notes?: string;
}

export interface SavedFormula {
  id: string;
  organization_id: string;
  client_id: string;
  version_number: number;
  formula_type: 'actual' | 'refined';
  formula_data: FormulaLine[];
  created_at: string;
}

/**
 * Save a formula version to client_formula_history.
 * Auto-increments version_number per client + formula_type.
 */
export async function saveFormula(params: SaveFormulaParams): Promise<SavedFormula> {
  // Determine version number
  const { count } = await supabase
    .from('client_formula_history')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', params.organization_id)
    .eq('client_id', params.client_id)
    .eq('formula_type', params.formula_type);

  const versionNumber = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('client_formula_history')
    .insert({
      organization_id: params.organization_id,
      client_id: params.client_id,
      appointment_id: params.appointment_id || null,
      appointment_service_id: params.appointment_service_id || null,
      mix_session_id: params.mix_session_id || null,
      service_name: params.service_name || null,
      formula_type: params.formula_type,
      formula_data: JSON.parse(JSON.stringify(params.formula_data)),
      staff_id: params.staff_id || null,
      staff_name: params.staff_name || null,
      notes: params.notes || null,
      version_number: versionNumber,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as SavedFormula;
}
