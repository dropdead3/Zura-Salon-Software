/**
 * Mixing Validators — Pure validation functions.
 *
 * Each function receives pre-fetched state and returns ValidationError[].
 * No DB calls. No side effects.
 */

import type { ValidationError } from './types';
import type { SessionStatus, MixSessionEventType } from '../mix-session-service';
import { canTransitionSession, isActiveSession, requiresReweigh } from '../session-state-machine';
import { isBowlOpen } from '../bowl-state-machine';
import type { MixBowlStatus } from '../bowl-state-machine';

// ─── Shared helpers ──────────────────────────────────

function requireAuth(initiatedBy: string): ValidationError[] {
  if (!initiatedBy) {
    return [{ code: 'NOT_AUTHENTICATED', message: 'User must be authenticated' }];
  }
  return [];
}

function requireSessionExists(session: unknown): ValidationError[] {
  if (!session) {
    return [{ code: 'SESSION_NOT_FOUND', message: 'Mix session does not exist' }];
  }
  return [];
}

function requireBowlExists(bowl: unknown): ValidationError[] {
  if (!bowl) {
    return [{ code: 'BOWL_NOT_FOUND', message: 'Bowl does not exist' }];
  }
  return [];
}

// ─── Session Status Validators ───────────────────────

interface SessionState {
  id: string;
  current_status: SessionStatus;
}

interface BowlState {
  id: string;
  status: MixBowlStatus;
  line_count?: number;
}

// ─── StartMixSession ─────────────────────────────────

export function validateStartMixSession(
  initiatedBy: string,
  session: SessionState | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  if (session && session.current_status !== 'draft') {
    errors.push({
      code: 'INVALID_STATE_TRANSITION',
      field: 'status',
      message: `Cannot start session in status "${session.current_status}" — must be "draft"`,
    });
  }
  return errors;
}

// ─── CreateBowl ──────────────────────────────────────

export function validateCreateBowl(
  initiatedBy: string,
  session: SessionState | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  // BUG-9 fix: Allow bowl creation in both 'draft' (prep mode) and 'active' sessions
  // BUG-10 fix: Use normalizeSessionStatus for proper type handling
  if (session) {
    const status = String(session.current_status);
    const allowedForBowl = status === 'draft' || status === 'active' || status === 'mixing';
    if (!allowedForBowl) {
      errors.push({
        code: 'SESSION_NOT_ACTIVE',
        field: 'status',
        message: `Cannot create bowl — session is "${session.current_status}"`,
      });
    }
  }
  return errors;
}

// ─── CaptureWeight ───────────────────────────────────

export function validateCaptureWeight(
  initiatedBy: string,
  session: SessionState | null,
  bowl: BowlState | null,
  weight: number,
  isManualOverride: boolean,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  errors.push(...requireBowlExists(bowl));

  if (session && !isActiveSession(session.current_status as any)) {
    errors.push({
      code: 'SESSION_NOT_ACTIVE',
      field: 'status',
      message: `Cannot capture weight — session is "${session.current_status}"`,
    });
  }
  if (bowl && !isBowlOpen(bowl.status)) {
    errors.push({
      code: 'BOWL_NOT_OPEN',
      field: 'bowl_status',
      message: `Cannot capture weight — bowl is "${bowl.status}"`,
    });
  }
  if (weight <= 0 && !isManualOverride) {
    errors.push({
      code: 'INVALID_WEIGHT',
      field: 'weight',
      message: 'Weight must be positive (or use manual override)',
    });
  }
  return errors;
}

// ─── RecordLineItem ──────────────────────────────────

export function validateRecordLineItem(
  initiatedBy: string,
  session: SessionState | null,
  bowl: BowlState | null,
  productId: string | null,
  quantity: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  errors.push(...requireBowlExists(bowl));

  if (session && !isActiveSession(session.current_status as any)) {
    errors.push({ code: 'SESSION_NOT_ACTIVE', message: 'Session is not active' });
  }
  if (bowl && !isBowlOpen(bowl.status)) {
    errors.push({ code: 'BOWL_NOT_OPEN', message: `Bowl is "${bowl.status}"` });
  }
  if (!productId) {
    errors.push({ code: 'PRODUCT_REQUIRED', field: 'product_id', message: 'Product is required' });
  }
  if (quantity <= 0) {
    errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Quantity must be positive' });
  }
  return errors;
}

// ─── RemoveLineItem ──────────────────────────────────

export function validateRemoveLineItem(
  initiatedBy: string,
  session: SessionState | null,
  bowl: BowlState | null,
  lineExists: boolean,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  errors.push(...requireBowlExists(bowl));

  if (session && !isActiveSession(session.current_status as any)) {
    errors.push({ code: 'SESSION_NOT_ACTIVE', message: 'Session is not active' });
  }
  if (bowl && !isBowlOpen(bowl.status)) {
    errors.push({ code: 'BOWL_NOT_OPEN', message: `Bowl is "${bowl.status}"` });
  }
  if (!lineExists) {
    errors.push({ code: 'LINE_NOT_FOUND', message: 'Line item does not exist' });
  }
  return errors;
}

// ─── SealBowl ────────────────────────────────────────

export function validateSealBowl(
  initiatedBy: string,
  session: SessionState | null,
  bowl: BowlState | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  errors.push(...requireBowlExists(bowl));

  if (session && !isActiveSession(session.current_status as any)) {
    errors.push({ code: 'SESSION_NOT_ACTIVE', message: 'Session is not active' });
  }
  if (bowl && !isBowlOpen(bowl.status)) {
    errors.push({ code: 'BOWL_NOT_OPEN', message: `Bowl is "${bowl.status}"` });
  }
  if (bowl && (bowl.line_count ?? 0) === 0) {
    errors.push({ code: 'BOWL_EMPTY', message: 'Cannot seal an empty bowl' });
  }
  return errors;
}

// ─── CaptureReweigh ──────────────────────────────────

export function validateCaptureReweigh(
  initiatedBy: string,
  session: SessionState | null,
  bowl: BowlState | null,
  weight: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  errors.push(...requireBowlExists(bowl));

  if (session && !requiresReweigh(session.current_status as any)) {
    errors.push({
      code: 'SESSION_NOT_AWAITING_REWEIGH',
      message: `Session is "${session.current_status}" — expected "awaiting_reweigh"`,
    });
  }
  if (bowl && bowl.status !== 'sealed') {
    errors.push({ code: 'BOWL_NOT_SEALED', message: `Bowl must be sealed for reweigh, is "${bowl.status}"` });
  }
  if (weight < 0) {
    errors.push({ code: 'INVALID_WEIGHT', field: 'weight', message: 'Reweigh weight cannot be negative' });
  }
  return errors;
}

// ─── CompleteSession ─────────────────────────────────

export function validateCompleteSession(
  initiatedBy: string,
  session: SessionState | null,
  allBowlsTerminal: boolean,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));

  if (session && !requiresReweigh(session.current_status as any)) {
    errors.push({
      code: 'SESSION_NOT_AWAITING_REWEIGH',
      message: `Cannot complete — session is "${session.current_status}"`,
    });
  }
  if (!allBowlsTerminal) {
    errors.push({ code: 'BOWLS_NOT_COMPLETE', message: 'All bowls must be reweighed or discarded' });
  }
  return errors;
}

// ─── MarkSessionUnresolved ───────────────────────────

export function validateMarkSessionUnresolved(
  initiatedBy: string,
  session: SessionState | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));

  if (session && !requiresReweigh(session.current_status as any)) {
    errors.push({
      code: 'SESSION_NOT_AWAITING_REWEIGH',
      message: `Cannot mark unresolved — session is "${session.current_status}"`,
    });
  }
  return errors;
}

// ─── ApplySuggestedFormula ───────────────────────────

export function validateApplySuggestedFormula(
  initiatedBy: string,
  session: SessionState | null,
  bowl: BowlState | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  errors.push(...requireBowlExists(bowl));
  if (session && !isActiveSession(session.current_status as any)) {
    errors.push({
      code: 'SESSION_NOT_ACTIVE',
      message: `Cannot apply suggestion — session is "${session.current_status}"`,
    });
  }
  if (bowl && !isBowlOpen(bowl.status)) {
    errors.push({
      code: 'BOWL_NOT_OPEN',
      message: `Cannot apply suggestion — bowl is "${bowl.status}"`,
    });
  }
  return errors;
}

// ─── DismissSuggestedFormula ─────────────────────────

export function validateDismissSuggestedFormula(
  initiatedBy: string,
  session: SessionState | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...requireAuth(initiatedBy));
  errors.push(...requireSessionExists(session));
  if (session && !isActiveSession(session.current_status as any)) {
    errors.push({
      code: 'SESSION_NOT_ACTIVE',
      message: `Cannot dismiss suggestion — session is "${session.current_status}"`,
    });
  }
  return errors;
}
