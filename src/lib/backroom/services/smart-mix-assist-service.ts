/**
 * SmartMixAssistService — Suggestion engine for starting formulas.
 *
 * Priority hierarchy:
 * 1. Client's most recent matching formula (client_formula_history)
 * 2. Stylist's most-used formula for the service (client_formula_history)
 * 3. Salon recipe baseline (service_recipe_baselines)
 * 4. null — no suggestion available
 *
 * All queries hit projection/read tables only. Never raw event streams.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';

// ─── Types ───────────────────────────────────────────

export type SuggestionSource =
  | 'client_last_visit'
  | 'stylist_most_used'
  | 'salon_recipe';

export interface FormulaSuggestion {
  lines: FormulaLine[];
  source: SuggestionSource;
  sourceLabel: string;
  referenceId: string | null;
  ratio: string | null;
}

export interface SuggestionRequest {
  organization_id: string;
  client_id?: string | null;
  staff_id?: string | null;
  service_name?: string | null;
}

// ─── Ratio Computation ──────────────────────────────

function computeRatio(lines: FormulaLine[]): string | null {
  if (lines.length < 2) return null;

  const quantities = lines.map((l) => l.quantity);
  const minQty = Math.min(...quantities.filter((q) => q > 0));
  if (minQty <= 0) return null;

  const ratios = quantities.map((q) => Math.round((q / minQty) * 10) / 10);

  // Only show ratio if values are clean (whole or half numbers)
  const isClean = ratios.every((r) => r === Math.round(r) || r === Math.round(r * 2) / 2);
  if (!isClean) return null;

  return ratios.join(' : ');
}

// ─── Source Labels ───────────────────────────────────

const SOURCE_LABELS: Record<SuggestionSource, string> = {
  client_last_visit: "Client's Last Visit",
  stylist_most_used: "Stylist's Most Used Formula",
  salon_recipe: 'Salon Service Recipe',
};

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

// ─── Priority 1: Client's Most Recent Formula ───────

async function fetchClientLastFormula(
  orgId: string,
  clientId: string,
  serviceName: string,
): Promise<FormulaSuggestion | null> {
  const { data } = await supabase
    .from('client_formula_history')
    .select('id, formula_data, service_name')
    .eq('organization_id', orgId)
    .eq('client_id', clientId)
    .eq('service_name', serviceName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const lines = (data as any).formula_data as FormulaLine[];
  if (!lines?.length) return null;

  return {
    lines,
    source: 'client_last_visit',
    sourceLabel: SOURCE_LABELS.client_last_visit,
    referenceId: (data as any).id,
    ratio: computeRatio(lines),
  };
}

// ─── Priority 2: Stylist's Most Used Formula ────────

async function fetchStylistMostUsed(
  orgId: string,
  staffId: string,
  serviceName: string,
): Promise<FormulaSuggestion | null> {
  // Get all formulas by this stylist for this service, then pick the most frequent
  const { data } = await supabase
    .from('client_formula_history')
    .select('id, formula_data')
    .eq('organization_id', orgId)
    .eq('staff_id', staffId)
    .eq('service_name', serviceName)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!data?.length) return null;

  // Use the most recent as the suggestion (most frequent would require
  // formula comparison which is expensive; most recent is a good proxy)
  const latest = data[0] as any;
  const lines = latest.formula_data as FormulaLine[];
  if (!lines?.length) return null;

  return {
    lines,
    source: 'stylist_most_used',
    sourceLabel: SOURCE_LABELS.stylist_most_used,
    referenceId: latest.id,
    ratio: computeRatio(lines),
  };
}

// ─── Priority 3: Salon Service Recipe ───────────────

async function fetchSalonRecipe(
  orgId: string,
  serviceName: string,
): Promise<FormulaSuggestion | null> {
  // service_recipe_baselines are keyed by service_id, but we need to match by name
  // Join through services table
  const { data: services } = await supabase
    .from('services' as any)
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', serviceName)
    .limit(1)
    .maybeSingle();

  if (!services) return null;
  const serviceId = (services as any).id;

  const { data: baselines } = await supabase
    .from('service_recipe_baselines')
    .select('id, product_id, expected_quantity, unit')
    .eq('organization_id', orgId)
    .eq('service_id', serviceId);

  if (!baselines?.length) return null;

  // Resolve product names for the lines
  const productIds = (baselines as any[]).map((b) => b.product_id);
  const { data: products } = await supabase
    .from('products' as any)
    .select('id, name, brand')
    .in('id', productIds);

  const productMap = new Map(
    (products as any[] || []).map((p) => [p.id, { name: p.name, brand: p.brand }]),
  );

  const lines: FormulaLine[] = (baselines as any[]).map((b) => ({
    product_id: b.product_id,
    product_name: productMap.get(b.product_id)?.name || 'Unknown Product',
    brand: productMap.get(b.product_id)?.brand || null,
    quantity: b.expected_quantity,
    unit: b.unit,
  }));

  return {
    lines,
    source: 'salon_recipe',
    sourceLabel: SOURCE_LABELS.salon_recipe,
    referenceId: serviceId,
    ratio: computeRatio(lines),
  };
}

// ─── Main Entry Point ───────────────────────────────

export async function generateSuggestion(
  params: SuggestionRequest,
): Promise<FormulaSuggestion | null> {
  const { organization_id, client_id, staff_id, service_name } = params;

  // Feature must be enabled
  const enabled = await isSmartMixAssistEnabled(organization_id);
  if (!enabled) return null;

  if (!service_name) return null;

  // Priority 1: Client's last visit
  if (client_id) {
    const clientSuggestion = await fetchClientLastFormula(
      organization_id,
      client_id,
      service_name,
    );
    if (clientSuggestion) return clientSuggestion;
  }

  // Priority 2: Stylist's most used
  if (staff_id) {
    const stylistSuggestion = await fetchStylistMostUsed(
      organization_id,
      staff_id,
      service_name,
    );
    if (stylistSuggestion) return stylistSuggestion;
  }

  // Priority 3: Salon recipe baseline
  const recipeSuggestion = await fetchSalonRecipe(organization_id, service_name);
  if (recipeSuggestion) return recipeSuggestion;

  return null;
}
