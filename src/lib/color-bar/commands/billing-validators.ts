/**
 * Billing Validators — Pure validation functions.
 */

import type { ValidationError } from './types';

export function validateComputeCheckoutCharge(
  initiatedBy: string,
  sessionCompleted: boolean,
  organizationId: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!sessionCompleted) {
    errors.push({ code: 'SESSION_NOT_COMPLETED', message: 'Session must be completed before computing charges' });
  }
  if (!organizationId) {
    errors.push({ code: 'ORG_REQUIRED', field: 'organization_id', message: 'Organization is required' });
  }
  return errors;
}

export function validateApplyChargeOverride(
  initiatedBy: string,
  projectionExists: boolean,
  isManager: boolean,
  reason: string,
  newAmount: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!projectionExists) {
    errors.push({ code: 'PROJECTION_NOT_FOUND', message: 'Checkout projection does not exist' });
  }
  if (!isManager) {
    errors.push({ code: 'INSUFFICIENT_ROLE', message: 'Only managers can override charges' });
  }
  if (!reason?.trim()) {
    errors.push({ code: 'REASON_REQUIRED', field: 'reason', message: 'Override reason is required' });
  }
  if (newAmount < 0) {
    errors.push({ code: 'INVALID_AMOUNT', field: 'new_amount', message: 'Override amount cannot be negative' });
  }
  return errors;
}
