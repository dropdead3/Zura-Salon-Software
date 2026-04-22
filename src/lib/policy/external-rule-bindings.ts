/**
 * external-rule-bindings — registry of inline-chip tokens that are backed by
 * an org-scoped setting *outside* `policy_rule_blocks`.
 *
 * Doctrine: most chips on the Policy Configurator edit a single block in the
 * draft `policy_rule_blocks` row set. A small number of operationally-binding
 * flags already live elsewhere in the system (e.g. `business_settings` /
 * `backroom_settings` rows that are read by edge functions on every relevant
 * event). When the policy prose makes an assertion that depends on one of
 * those flags, the chip on the assertion must read and write the same row —
 * otherwise the disclosure card can lie about whether the rule is enforced.
 *
 * This module is the typed registry that lets `InlineRuleEditor` recognize
 * such tokens and route their reads/writes through the binding instead of
 * the standard `save_policy_rule_blocks` path. Both surfaces converge on the
 * same row, so toggling either one re-renders the other on next render via
 * the shared react-query keys.
 *
 * Keep this list short. Generalizing more `business_settings` flags into the
 * registry is deferred until 2+ policies need a given flag — premature
 * generalization risks an over-engineered binding API.
 */
import type { QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RuleField } from './configurator-schemas';

export interface ExternalRuleBinding {
  /** Token name as it appears in prose, e.g. `auto_ban_on_dispute`. */
  key: string;
  /** Schema for the popover (control type, defaults, humanizeAs). */
  field: RuleField;
  /** Read the current value for this org. */
  read: (orgId: string) => Promise<unknown>;
  /** Persist a new value for this org. */
  write: (orgId: string, value: unknown, userId: string | null) => Promise<void>;
  /** React-query keys to invalidate after a successful write so any other
   *  surface reading the same setting re-renders in sync. */
  invalidateKeys: (orgId: string) => QueryKey[];
}

// ─── auto_ban_on_dispute ────────────────────────────────────────────────────
// Mirrors `DisputePolicySettings.tsx`'s read/write path. Stored in
// `backroom_settings` (despite the misleading "Color Bar" branding it is the
// canonical org-scoped settings table) under setting_key='dispute_policy'.
// `stripe-webhook` reads `auto_ban_on_dispute` on every `charge.dispute.created`.

const DISPUTE_SETTING_KEY = 'dispute_policy';

const autoBanOnDispute: ExternalRuleBinding = {
  key: 'auto_ban_on_dispute',
  field: {
    key: 'auto_ban_on_dispute',
    label: 'Auto-restrict on chargeback',
    helper:
      'Automatically restrict booking privileges when a client files a chargeback with their bank.',
    type: 'boolean',
    defaultValue: false,
    humanizeAs: { true: 'on', false: 'off' },
  },
  read: async (orgId) => {
    const { data } = await supabase
      .from('backroom_settings')
      .select('setting_value')
      .eq('organization_id', orgId)
      .is('location_id', null)
      .eq('setting_key', DISPUTE_SETTING_KEY)
      .maybeSingle();
    const value = (data?.setting_value as Record<string, unknown> | null) ?? {};
    return value.auto_ban_on_dispute === true;
  },
  write: async (orgId, value, userId) => {
    const next = { auto_ban_on_dispute: value === true };

    // Mirrors useUpsertColorBarSetting: select-then-insert/update because the
    // partial unique index on (org, key) WHERE location_id IS NULL doesn't
    // play nicely with onConflict.
    const { data: existing } = await supabase
      .from('backroom_settings')
      .select('id')
      .eq('organization_id', orgId)
      .is('location_id', null)
      .eq('setting_key', DISPUTE_SETTING_KEY)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('backroom_settings')
        .update({
          setting_value: next as unknown as Record<string, never>,
          updated_by: userId,
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('backroom_settings').insert({
        organization_id: orgId,
        location_id: null,
        setting_key: DISPUTE_SETTING_KEY,
        setting_value: next as unknown as Record<string, never>,
        updated_by: userId,
      });
      if (error) throw error;
    }

    // Audit log — same shape used by the standalone settings card.
    await supabase.rpc('log_platform_action', {
      _org_id: orgId,
      _action: 'backroom_setting_updated',
      _entity_type: 'backroom_settings',
      _details: { key: DISPUTE_SETTING_KEY, location_id: null, source: 'policy_inline_chip' },
    });
  },
  invalidateKeys: (orgId) => [
    // Matches the DisputePolicySettings card's query so it re-renders.
    ['color-bar-settings', orgId],
    ['color-bar-settings', orgId, DISPUTE_SETTING_KEY, undefined],
    ['color-bar-settings', orgId, DISPUTE_SETTING_KEY, null],
    // The chip's own external-values cache key.
    ['policy-external-rule', orgId, 'auto_ban_on_dispute'],
  ],
};

export const EXTERNAL_RULE_BINDINGS: Record<string, ExternalRuleBinding> = {
  [autoBanOnDispute.key]: autoBanOnDispute,
};

export function getExternalRuleBinding(key: string): ExternalRuleBinding | undefined {
  return EXTERNAL_RULE_BINDINGS[key];
}

/**
 * Extract the set of external binding keys referenced by a piece of prose.
 * Used by `InlineRuleEditor` to decide which external values to fetch for
 * the active variant.
 */
export function extractExternalBindingKeys(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = /\{\{\s*[?^/]?\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (EXTERNAL_RULE_BINDINGS[m[1]]) out.add(m[1]);
  }
  return Array.from(out);
}
