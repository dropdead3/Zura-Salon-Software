import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';

/**
 * Deterministic avatar background colors for client initials.
 * Uses muted, theme-friendly hues that work in both light and dark mode.
 */
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
] as const;

/** Extract initials from a client name (first + last initial). */
export function getClientInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Get a deterministic color class string for a client name. */
export function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Format multi-service appointments with per-service durations.
 * Returns null for single-service or when serviceLookup is unavailable.
 * Example: "Haircut 60min + Glaze 30min"
 */
export function formatServicesWithDuration(
  serviceName: string | null | undefined,
  serviceLookup: Map<string, ServiceLookupEntry> | undefined
): string | null {
  if (!serviceName || !serviceLookup) return null;
  const services = serviceName.split(',').map(s => s.trim()).filter(Boolean);
  if (services.length <= 1) return null;

  const parts = services.map(name => {
    const info = serviceLookup.get(name);
    return info ? `${name} ${info.duration_minutes}min` : name;
  });
  return parts.join(' + ');
}
