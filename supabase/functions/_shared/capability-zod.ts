// ============================================================
// Capability Parameter Schemas (Zod)
// ----------------------------------------------------------------
// Per-capability strict Zod schemas. The handler trusts these.
// Validation runs at BOTH propose-time and execute-time.
//
// To add a new capability: add its schema here and register it in
// CAPABILITY_PARAM_SCHEMAS below.
// ============================================================

// deno-lint-ignore-file no-explicit-any

import { z } from '../_shared/validation.ts';

const uuid = z.string().uuid();
const shortText = (max = 500) => z.string().trim().max(max);

// --- read capabilities ---
const TeamFindMember = z.object({
  query: shortText(120).min(1),
});

const AppointmentsFindToday = z.object({
  staff_user_id: uuid.optional(),
  location_id: uuid.optional(),
});

// --- mutation capabilities ---
const TeamDeactivateMember = z.object({
  member_id: uuid,
  member_name: shortText(200).optional(),
  reason: shortText(500).optional().nullable(),
});

const TeamReactivateMember = z.object({
  member_id: uuid,
  member_name: shortText(200).optional(),
});

const AppointmentsReschedule = z.object({
  appointment_id: uuid,
  new_date: shortText(20).min(1),
  new_time: shortText(20).min(1),
  staff_user_id: uuid.optional(),
  location_id: uuid.optional(),
  client_name: shortText(200).optional(),
});

const AppointmentsCancel = z.object({
  appointment_id: uuid,
  client_name: shortText(200).optional(),
  reason: shortText(500).optional().nullable(),
});

export const CAPABILITY_PARAM_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'team.find_member': TeamFindMember,
  'team.deactivate_member': TeamDeactivateMember,
  'team.reactivate_member': TeamReactivateMember,
  'appointments.find_today': AppointmentsFindToday,
  'appointments.reschedule': AppointmentsReschedule,
  'appointments.cancel': AppointmentsCancel,
};

/**
 * Validate `params` against the registered schema for a capability.
 * Returns parsed (and stripped) params on success; throws Error with
 * a flat field-error message on failure.
 *
 * If no schema is registered, this falls open (returns params as-is)
 * but logs a warning — capability-invariants will surface the gap.
 */
export function validateCapabilityParams(
  capabilityId: string,
  params: unknown,
): Record<string, unknown> {
  const schema = CAPABILITY_PARAM_SCHEMAS[capabilityId];
  if (!schema) {
    console.warn(`[capability-zod] no schema registered for "${capabilityId}" — falling open.`);
    return (params as Record<string, unknown>) || {};
  }
  const parsed = schema.safeParse(params || {});
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const summary = Object.entries(flat)
      .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
      .join('; ');
    throw new Error(`Invalid parameters: ${summary || 'unknown'}.`);
  }
  return parsed.data as Record<string, unknown>;
}
