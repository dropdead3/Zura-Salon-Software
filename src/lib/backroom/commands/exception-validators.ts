/**
 * Exception Validators — Pure validation functions.
 */

import type { ValidationError } from './types';

export function validateResolveException(
  initiatedBy: string,
  exceptionExists: boolean,
  currentStatus: string | null,
  action: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!initiatedBy) {
    errors.push({ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' });
  }
  if (!exceptionExists) {
    errors.push({ code: 'EXCEPTION_NOT_FOUND', message: 'Exception does not exist' });
  }
  if (currentStatus && ['resolved', 'dismissed'].includes(currentStatus)) {
    errors.push({
      code: 'ALREADY_RESOLVED',
      field: 'status',
      message: `Exception is already "${currentStatus}"`,
    });
  }
  if (!['acknowledged', 'resolved', 'dismissed'].includes(action)) {
    errors.push({
      code: 'INVALID_ACTION',
      field: 'action',
      message: `Invalid action "${action}" — must be acknowledged, resolved, or dismissed`,
    });
  }
  return errors;
}
