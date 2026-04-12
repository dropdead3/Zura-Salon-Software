// ─── PostMessage Contract for Zura Booking Embed ─────────────────
// Used between the embedded iframe (booking app) and the host page (embed loader).

export const ZURA_MESSAGE_NAMESPACE = 'zura-booking';

export type ZuraMessageType =
  | 'ZURA_BOOKING_READY'
  | 'ZURA_BOOKING_RESIZE'
  | 'ZURA_BOOKING_STEP_CHANGE'
  | 'ZURA_BOOKING_COMPLETE'
  | 'ZURA_BOOKING_ERROR'
  | 'ZURA_MODAL_CLOSE';

export interface ZuraBookingMessage {
  namespace: typeof ZURA_MESSAGE_NAMESPACE;
  type: ZuraMessageType;
  payload?: Record<string, unknown>;
}

// ─── Dispatch helpers (called from inside the iframe) ────────────

function post(type: ZuraMessageType, payload?: Record<string, unknown>) {
  if (window.parent === window) return; // not in an iframe
  const message: ZuraBookingMessage = { namespace: ZURA_MESSAGE_NAMESPACE, type, payload };
  window.parent.postMessage(message, '*');
}

export function sendBookingReady() {
  post('ZURA_BOOKING_READY');
}

export function sendBookingResize(height: number) {
  post('ZURA_BOOKING_RESIZE', { height });
}

export function sendStepChange(step: string, index: number) {
  post('ZURA_BOOKING_STEP_CHANGE', { step, index });
}

export function sendBookingComplete(details?: Record<string, unknown>) {
  post('ZURA_BOOKING_COMPLETE', details);
}

export function sendBookingError(message: string) {
  post('ZURA_BOOKING_ERROR', { message });
}

export function sendModalClose() {
  post('ZURA_MODAL_CLOSE');
}

// ─── Validation helper (used by embed loader) ────────────────────

export function isZuraMessage(event: MessageEvent): event is MessageEvent<ZuraBookingMessage> {
  return (
    event.data &&
    typeof event.data === 'object' &&
    event.data.namespace === ZURA_MESSAGE_NAMESPACE
  );
}
