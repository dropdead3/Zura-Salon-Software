/**
 * Per-device memory for the org-branded login surface.
 *
 * Stores the last 1–3 successful sign-ins per organization so a household
 * sharing one laptop sees a compact tile picker instead of either a full
 * grid (shared mode) or a forced single-user (personal mode).
 *
 * Lives in localStorage. Cleared by the "Forget this device" action.
 */

export interface RememberedDeviceUser {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  last_used_at: number;
}

const MAX_RECENTS = 3;

function key(orgSlug: string) {
  return `zura.org-login.recent.${orgSlug}`;
}

export function getRecentUsers(orgSlug: string | undefined): RememberedDeviceUser[] {
  if (!orgSlug || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key(orgSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (u): u is RememberedDeviceUser =>
          u && typeof u.user_id === 'string' && typeof u.display_name === 'string',
      )
      .sort((a, b) => b.last_used_at - a.last_used_at)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushRecentUser(
  orgSlug: string | undefined,
  user: Omit<RememberedDeviceUser, 'last_used_at'>,
) {
  if (!orgSlug || typeof window === 'undefined') return;
  try {
    const existing = getRecentUsers(orgSlug).filter((u) => u.user_id !== user.user_id);
    const next: RememberedDeviceUser[] = [
      { ...user, last_used_at: Date.now() },
      ...existing,
    ].slice(0, MAX_RECENTS);
    localStorage.setItem(key(orgSlug), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function forgetRecentUser(orgSlug: string | undefined, userId: string) {
  if (!orgSlug || typeof window === 'undefined') return;
  try {
    const next = getRecentUsers(orgSlug).filter((u) => u.user_id !== userId);
    localStorage.setItem(key(orgSlug), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearRecentUsers(orgSlug: string | undefined) {
  if (!orgSlug || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key(orgSlug));
  } catch {
    // ignore
  }
}
