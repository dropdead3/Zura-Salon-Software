/**
 * Inventory Validators — Pure validation functions.
 *
 * No DB calls. No side effects.
 */

import type { ValidationError } from './types';

// ─── PostUsageDepletion ──────────────────────────────

export function validatePostUsageDepletion(
  initiatedBy: string,
  sessionExists: boolean,
  sessionCompleted: boolean,
  organizationId: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!sessionExists) {
    errors.push({ code: 'SESSION_NOT_FOUND', message: 'Mix session does not exist' });
  }
  if (sessionExists && !sessionCompleted) {
    errors.push({ code: 'SESSION_NOT_COMPLETED', message: 'Session must be completed before posting usage' });
  }
  if (!organizationId) {
    errors.push({ code: 'ORG_REQUIRED', field: 'organization_id', message: 'Organization is required' });
  }
  return errors;
}

// ─── CreateCountAdjustment ───────────────────────────

export function validateCreateCountAdjustment(
  initiatedBy: string,
  productExists: boolean,
  quantity: number,
  reason: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!productExists) {
    errors.push({ code: 'PRODUCT_NOT_FOUND', field: 'product_id', message: 'Product does not exist' });
  }
  if (quantity === 0) {
    errors.push({ code: 'ZERO_QUANTITY', field: 'quantity', message: 'Adjustment quantity cannot be zero' });
  }
  if (!reason?.trim()) {
    errors.push({ code: 'REASON_REQUIRED', field: 'reason', message: 'Reason is required for adjustments' });
  }
  return errors;
}

// ─── CreateTransfer ──────────────────────────────────

export function validateCreateTransfer(
  initiatedBy: string,
  productExists: boolean,
  quantity: number,
  fromLocationId: string,
  toLocationId: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!productExists) {
    errors.push({ code: 'PRODUCT_NOT_FOUND', field: 'product_id', message: 'Product does not exist' });
  }
  if (quantity <= 0) {
    errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Transfer quantity must be positive' });
  }
  if (!fromLocationId) {
    errors.push({ code: 'FROM_LOCATION_REQUIRED', field: 'from_location_id', message: 'Source location is required' });
  }
  if (!toLocationId) {
    errors.push({ code: 'TO_LOCATION_REQUIRED', field: 'to_location_id', message: 'Destination location is required' });
  }
  if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
    errors.push({ code: 'SAME_LOCATION', message: 'Source and destination must be different' });
  }
  return errors;
}

// ─── PostWaste ───────────────────────────────────────

export function validatePostWaste(
  initiatedBy: string,
  productExists: boolean,
  quantity: number,
  reason: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!productExists) {
    errors.push({ code: 'PRODUCT_NOT_FOUND', field: 'product_id', message: 'Product does not exist' });
  }
  if (quantity <= 0) {
    errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Waste quantity must be positive' });
  }
  if (!reason?.trim()) {
    errors.push({ code: 'REASON_REQUIRED', field: 'reason', message: 'Reason is required for waste recording' });
  }
  return errors;
}
