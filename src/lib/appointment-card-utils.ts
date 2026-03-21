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

/** Extra categories that are treated as add-ons (listed last). */
const EXTRAS_CATEGORIES = new Set(['extras', 'extra', 'add-on', 'add-ons', 'addon', 'addons']);

function isExtrasCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return EXTRAS_CATEGORIES.has(category.toLowerCase());
}

export interface SortedService {
  name: string;
  duration: number;
  price: number | null;
  category: string | null;
  isExtra: boolean;
}

/**
 * Sort services: primary services first (by duration desc), extras last (by price desc).
 */
export function sortServices(
  serviceName: string | null | undefined,
  serviceLookup: Map<string, ServiceLookupEntry> | undefined
): SortedService[] {
  if (!serviceName) return [];
  const names = serviceName.split(',').map(s => s.trim()).filter(Boolean);
  if (!serviceLookup) {
    return names.map(name => ({ name, duration: 0, price: null, category: null, isExtra: false }'));
  }

  const services = names.map(name => {
    const info = serviceLookup.get(name);
    const category = info?.category || null;
    return {
      name,
      duration: info?.duration_minutes || 0,
      price: info?.price ?? null,
      category,
      isExtra: isExtrasCategory(category),
    };
  });

  // Primary services: by duration desc; Extras: by price desc; Extras always last
  services.sort((a, b) => {
    if (a.isExtra !== b.isExtra) return a.isExtra ? 1 : -1;
    if (a.isExtra) {
      // Both extras — sort by price desc
      return (b.price ?? 0) - (a.price ?? 0);
    }
    // Both primary — sort by duration desc
    return b.duration - a.duration;
  });

  return services;
}

/**
 * Format multi-service appointments with per-service durations.
 * Returns null for single-service or when serviceLookup is unavailable.
 * Now uses sorted order (primary by duration desc, extras last by price desc).
 */
export function formatServicesWithDuration(
  serviceName: string | null | undefined,
  serviceLookup: Map<string, ServiceLookupEntry> | undefined
): string | null {
  if (!serviceName || !serviceLookup) return null;
  const sorted = sortServices(serviceName, serviceLookup);
  if (sorted.length <= 1) return null;

  const parts = sorted.map(s => {
    const info = serviceLookup.get(s.name);
    return info ? `${s.name} ${info.duration_minutes}min` : s.name;
  });
  return parts.join(' + ');
}
