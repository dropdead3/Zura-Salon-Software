/**
 * dock-utils — Shared formatting helpers for the Dock UI.
 */

/**
 * Formats a full name as "First L." (first name + last initial with period).
 * If only one name part, returns it as-is.
 */
export function formatFirstLastInitial(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.join(' ');
}
