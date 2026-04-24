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
  SERVICE_TIME_ADJUSTED: 'service_time_adjusted',
  SERVICE_DURATION_ADJUSTED: 'service_duration_adjusted',
  SERVICE_PRICE_OVERRIDDEN: 'service_price_overridden',
  SERVICE_RQ_TOGGLED: 'service_rq_toggled',
  
  // Notes
  NOTE_ADDED: 'note_added',

  // Color Bar
  MIX_SESSION_STARTED: 'mix_session_started',
  MIX_SESSION_COMPLETED: 'mix_session_completed',
  BOWL_REWEIGHED: 'bowl_reweighed',
  WASTE_RECORDED: 'waste_recorded',

  // Service edits
  SERVICES_UPDATED: 'services_updated',

  // Checkout cart negotiation (Wave 2)
  LINE_PRICE_OVERRIDDEN: 'line_price_overridden',
  LINE_WAIVED: 'line_waived',
  LINE_DISCOUNTED: 'line_discounted',
  SERVICE_ADDED_AT_CHECKOUT: 'service_added_at_checkout',
  SERVICE_REMOVED_AT_CHECKOUT: 'service_removed_at_checkout',
} as const;

export type AuditEventType = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];
