/**
 * Navigation tracking utility for public site analytics.
 * Emits CustomEvents that any analytics integration can subscribe to.
 */

export interface NavTrackingPayload {
  label: string;
  href: string;
  tracking_key?: string | null;
  item_type?: string;
  visibility?: string;
  cta_style?: string;
  menu_location?: 'header' | 'footer' | 'mobile';
}

export function emitNavEvent(eventName: 'nav_item_clicked' | 'cta_clicked', payload: NavTrackingPayload) {
  if (import.meta.env.DEV) {
    console.debug(`[nav-tracking] ${eventName}`, payload);
  }

  window.dispatchEvent(
    new CustomEvent(eventName, { detail: payload })
  );
}
