/**
 * CONTENT RESOLVER ENGINE
 *
 * Deterministic hook that resolves content for any theme slot.
 *
 * Resolution priority:
 * 1. Page-specific override (from page section config)
 * 2. Canonical content store (canonical_content table)
 * 3. Live business data (services, employee_profiles, locations, etc.)
 * 4. Theme default content (from blueprint)
 * 5. Empty state (null with metadata)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ThemeSlotMapping,
  ContentResolution,
  ContentSource,
  SlotBindingResult,
  ThemeBlueprint,
} from '@/types/theme-infrastructure';

// ─── Slot Mappings Query ────────────────────────────────────

export function useSlotMappings(themeId: string | undefined) {
  return useQuery({
    queryKey: ['theme-slot-mappings', themeId],
    enabled: !!themeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_slot_mappings')
        .select('*')
        .eq('theme_id', themeId!);

      if (error) throw error;
      return (data ?? []) as unknown as ThemeSlotMapping[];
    },
  });
}

// ─── Source Resolver ────────────────────────────────────────

function parseSource(source: string): { type: 'canonical' | 'table'; key: string } {
  if (source.startsWith('canonical:')) {
    return { type: 'canonical', key: source.replace('canonical:', '') };
  }
  if (source.startsWith('table:')) {
    return { type: 'table', key: source.replace('table:', '') };
  }
  // Default to canonical
  return { type: 'canonical', key: source };
}

// ─── Transform Value ────────────────────────────────────────

function applyTransformations(
  value: unknown,
  rules: Record<string, unknown>
): { value: unknown; applied: boolean } {
  if (!value || Object.keys(rules).length === 0) {
    return { value, applied: false };
  }

  let result = value;
  let applied = false;

  if (typeof result === 'string') {
    if (typeof rules.truncate === 'number' && result.length > (rules.truncate as number)) {
      result = result.slice(0, rules.truncate as number) + '…';
      applied = true;
    }
    if (rules.format === 'uppercase') {
      result = (result as string).toUpperCase();
      applied = true;
    }
    if (rules.format === 'lowercase') {
      result = (result as string).toLowerCase();
      applied = true;
    }
  }

  if (Array.isArray(result) && typeof rules.max_items === 'number') {
    result = result.slice(0, rules.max_items as number);
    applied = true;
  }

  return { value: result, applied };
}

// ─── Resolve a Single Slot ──────────────────────────────────

export function resolveSlot(
  slot: ThemeSlotMapping,
  canonicalContent: Record<string, unknown>,
  businessData: Record<string, unknown[]>,
  pageOverrides: Record<string, unknown>,
  blueprint: ThemeBlueprint
): ContentResolution {
  // 1. Page-specific override
  if (slot.slot_id in pageOverrides && pageOverrides[slot.slot_id] != null) {
    const { value, applied } = applyTransformations(
      pageOverrides[slot.slot_id],
      slot.transformation_rules
    );
    return { value, source: 'page_override', type: slot.expected_field_type, confidence: 1.0, transformApplied: applied };
  }

  // 2. Canonical content store
  const primaryParsed = parseSource(slot.primary_source);
  if (primaryParsed.type === 'canonical' && primaryParsed.key in canonicalContent) {
    const raw = canonicalContent[primaryParsed.key];
    const { value, applied } = applyTransformations(raw, slot.transformation_rules);
    return { value, source: 'canonical_store', type: slot.expected_field_type, confidence: 0.9, transformApplied: applied };
  }

  // 3. Business data tables
  if (primaryParsed.type === 'table' && primaryParsed.key in businessData) {
    const raw = businessData[primaryParsed.key];
    const { value, applied } = applyTransformations(raw, slot.transformation_rules);
    return { value, source: 'business_data', type: slot.expected_field_type, confidence: 0.85, transformApplied: applied };
  }

  // Try fallback source
  if (slot.fallback_source) {
    const fallbackParsed = parseSource(slot.fallback_source);
    if (fallbackParsed.type === 'canonical' && fallbackParsed.key in canonicalContent) {
      const raw = canonicalContent[fallbackParsed.key];
      const { value, applied } = applyTransformations(raw, slot.transformation_rules);
      return { value, source: 'canonical_store', type: slot.expected_field_type, confidence: 0.7, transformApplied: applied };
    }
    if (fallbackParsed.type === 'table' && fallbackParsed.key in businessData) {
      const raw = businessData[fallbackParsed.key];
      const { value, applied } = applyTransformations(raw, slot.transformation_rules);
      return { value, source: 'business_data', type: slot.expected_field_type, confidence: 0.6, transformApplied: applied };
    }
  }

  // 4. Theme default (from blueprint token defaults as a last resort)
  const defaultVal = blueprint.token_overrides.defaults[slot.slot_id];
  if (defaultVal !== undefined) {
    return { value: defaultVal, source: 'theme_default', type: slot.expected_field_type, confidence: 0.5, transformApplied: false };
  }

  // 5. Empty
  return { value: null, source: 'empty', type: slot.expected_field_type, confidence: 0, transformApplied: false };
}

// ─── Resolve All Slots for a Theme ──────────────────────────

export function useResolveAllSlots(
  themeId: string | undefined,
  orgId: string | undefined,
  slots: ThemeSlotMapping[],
  blueprint: ThemeBlueprint,
  pageOverrides: Record<string, unknown> = {}
) {
  // Fetch canonical content
  const canonicalQuery = useQuery({
    queryKey: ['canonical-content-map', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canonical_content')
        .select('content_key, value')
        .eq('organization_id', orgId!);

      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        const val = row.value as Record<string, unknown>;
        map[row.content_key] = val?.text ?? val?.url ?? val?.items ?? val;
      }
      return map;
    },
  });

  const resolved = useMemo<SlotBindingResult[]>(() => {
    if (!canonicalQuery.data || !themeId) return [];

    // Business data is resolved lazily by section components;
    // here we provide an empty map for the scoring/validation layer
    const businessData: Record<string, unknown[]> = {};

    return slots.map(slot => ({
      slotId: slot.slot_id,
      resolution: resolveSlot(slot, canonicalQuery.data!, businessData, pageOverrides, blueprint),
      slot,
    }));
  }, [slots, canonicalQuery.data, themeId, pageOverrides, blueprint]);

  return {
    data: resolved,
    isLoading: canonicalQuery.isLoading,
  };
}
