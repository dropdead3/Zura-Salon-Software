/**
 * Trigger a preview refresh from anywhere in the application.
 * Dispatches a custom event that the CanvasPanel iframe listens to.
 */
export function triggerPreviewRefresh() {
  window.dispatchEvent(new CustomEvent('website-preview-refresh'));
}
