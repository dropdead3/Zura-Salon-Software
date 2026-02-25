/**
 * Standardized audit event type constants.
 * Prevents typos across components that log to appointment_audit_log.
 */
export const AUDIT_EVENTS = {
  // Lifecycle
  STATUS_CHANGED: 'status_changed',
  CONFIRMATION_RECORDED: 'confirmation_recorded',
  
  // Rebooking gate
  REBOOK_DECLINED: 'rebook_declined',
  REBOOK_COMPLETED_AT_CHECKOUT: 'rebook_completed_at_checkout',
  
  // Assistants
  ASSISTANT_ASSIGNED: 'assistant_assigned',
  ASSISTANT_REMOVED: 'assistant_removed',
  
  // Service assignments
  SERVICE_REASSIGNED: 'service_reassigned',
  
  // Notes
  NOTE_ADDED: 'note_added',
} as const;

export type AuditEventType = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];
