/**
 * Purchasing Validators — Pure validation functions.
 */

import type { ValidationError } from './types';

export function validateReceiveShipment(
  initiatedBy: string,
  poExists: boolean,
  poStatus: string | null,
  lines: Array<{ quantity_received: number }>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!poExists) {
    errors.push({ code: 'PO_NOT_FOUND', message: 'Purchase order does not exist' });
  }
  if (poStatus && !['ordered', 'partially_received', 'approved'].includes(poStatus)) {
    errors.push({
      code: 'PO_STATUS_INVALID',
      field: 'status',
      message: `PO status "${poStatus}" does not allow receiving`,
    });
  }
  if (!lines.length) {
    errors.push({ code: 'NO_LINES', message: 'At least one receiving line is required' });
  }
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].quantity_received < 0) {
      errors.push({
        code: 'NEGATIVE_QUANTITY',
        field: `lines[${i}].quantity_received`,
        message: 'Received quantity cannot be negative',
      });
    }
  }
  return errors;
}
