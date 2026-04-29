// ============================================================
// Capability Registry Invariants
// ----------------------------------------------------------------
// Fail-fast checks that run on edge-function boot. If a capability
// row exists in the DB but its handler / risk / role contract is
// inconsistent, we refuse to serve traffic for it. This prevents
// "silent" misconfigurations from becoming security holes.
// ============================================================

// deno-lint-ignore-file no-explicit-any

import {
  getCapabilityHandlers,
  type CapabilityRow,
} from './capability-runtime.ts';

export interface InvariantViolation {
  capability_id: string;
  rule: string;
  detail: string;
}

const VALID_RISK = new Set(['low', 'med', 'high']);
const VALID_OWNERSHIP = new Set(['self', 'org', 'any']);

/**
 * Validate a single capability row against handler + contract rules.
 * Pure — does not throw. Returns the list of violations found.
 */
export function validateCapability(cap: CapabilityRow): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const push = (rule: string, detail: string) =>
    violations.push({ capability_id: cap.id, rule, detail });

  // --- token shape ---
  if (!VALID_RISK.has(cap.risk_level)) {
    push('risk_level_token', `risk_level "${cap.risk_level}" must be one of low|med|high`);
  }
  if (!VALID_OWNERSHIP.has(cap.ownership_scope)) {
    push('ownership_scope_token', `ownership_scope "${cap.ownership_scope}" must be one of self|org|any`);
  }

  // --- handler registration ---
  const handlers = getCapabilityHandlers(cap.id);
  if (!handlers) {
    push('missing_handler', 'No handler registered for this capability id.');
    return violations;
  }
  if (cap.mutation && !handlers.execute) {
    push('missing_execute', 'Mutation capability has no execute handler registered.');
  }
  if (cap.mutation && !handlers.propose) {
    push('missing_propose', 'Mutation capability has no propose handler — users cannot approve it.');
  }
  if (!cap.mutation && !handlers.read) {
    push('missing_read', 'Read-only capability has no read handler.');
  }

  // --- mutations must be gated ---
  if (cap.mutation) {
    const hasRole = Array.isArray(cap.required_role) && cap.required_role.length > 0;
    const hasPerm = !!cap.required_permission;
    if (!hasRole && !hasPerm) {
      push(
        'mutation_ungated',
        'Mutation capability has neither required_role nor required_permission — anyone could invoke it.',
      );
    }
  }

  // --- high-risk requires confirmation token field ---
  if (cap.risk_level === 'high' && !cap.confirmation_token_field) {
    push(
      'high_risk_no_confirmation',
      'High-risk capability must declare confirmation_token_field so the user types confirmation.',
    );
  }

  // --- ownership=any is a code smell on mutations ---
  if (cap.mutation && cap.ownership_scope === 'any') {
    push(
      'mutation_unscoped',
      'Mutation capability uses ownership_scope=any — should be self or org.',
    );
  }

  return violations;
}

/**
 * Validate every capability row. Logs violations. Returns the list
 * of capability IDs that should be considered DISABLED at runtime
 * (because their contract is broken).
 */
export function validateRegistry(rows: CapabilityRow[]): {
  violations: InvariantViolation[];
  disabledIds: Set<string>;
} {
  const violations: InvariantViolation[] = [];
  const disabledIds = new Set<string>();

  for (const cap of rows) {
    const v = validateCapability(cap);
    if (v.length > 0) {
      violations.push(...v);
      // Any structural violation disables the capability.
      disabledIds.add(cap.id);
    }
  }

  if (violations.length > 0) {
    console.error('[capability-invariants] violations:', JSON.stringify(violations, null, 2));
  }
  return { violations, disabledIds };
}
