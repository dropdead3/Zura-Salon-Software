/**
 * Resolve the display name shown on the public website for a curated review.
 *
 * Priority chain:
 *   1. operator override (display_name_override) — wins everything
 *   2. client preference (display_name_preference) applied to first/last name
 *   3. fallback "Anonymous" when no name is available
 *
 * Pure function — no hooks, no DB, safe for both editor preview and live render
 * (Preview-Live Parity Pattern).
 */

export type DisplayNamePreference = 'first_only' | 'first_initial' | 'anonymous';

export interface ResolveDisplayNameInput {
  override?: string | null;
  preference?: DisplayNamePreference | null;
  firstName?: string | null;
  lastName?: string | null;
}

export function resolveReviewDisplayName(input: ResolveDisplayNameInput): string {
  const override = (input.override ?? '').trim();
  if (override) return override;

  const first = (input.firstName ?? '').trim();
  const last = (input.lastName ?? '').trim();

  switch (input.preference) {
    case 'anonymous':
      return 'Anonymous';
    case 'first_initial':
      if (!first) return 'Anonymous';
      return last ? `${first} ${last[0].toUpperCase()}.` : first;
    case 'first_only':
      return first || 'Anonymous';
    default:
      // No preference captured — default to first + last initial (gentle privacy default).
      if (!first && !last) return 'Anonymous';
      if (!last) return first;
      return `${first} ${last[0].toUpperCase()}.`;
  }
}
