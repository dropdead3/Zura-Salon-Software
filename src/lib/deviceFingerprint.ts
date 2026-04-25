/**
 * Stable per-device fingerprint for PIN rate-limit scoping.
 *
 * NOT a security identifier — it's a soft hint so a single fat-fingered
 * staffer on one iPad can't lock out an entire chain of 30 iPads.
 *
 * Generated once per browser/localStorage instance and persisted. If a user
 * clears storage or reinstalls the PWA, they get a new fingerprint — that's
 * fine, the org-wide safety floor still catches abuse.
 */

const KEY = 'zura.device-fingerprint';

export function getDeviceFingerprint(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let fp = localStorage.getItem(KEY);
    if (!fp) {
      // crypto.randomUUID is available in all modern browsers + iOS 15.4+
      fp =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `fp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, fp);
    }
    return fp;
  } catch {
    return null;
  }
}
