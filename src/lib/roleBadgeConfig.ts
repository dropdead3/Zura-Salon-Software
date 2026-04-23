import { Crown, Shield, Scissors, Headset, HandHelping, User, Gem, type LucideIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { getRoleColorClasses } from '@/components/dashboard/RoleColorPicker';

type AppRole = Database['public']['Enums']['app_role'];

export interface RoleBadgeConfig {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  colorClasses: string;
  /** Sort priority — lower = shows first */
  order: number;
}

const ROLE_BADGE_MAP: Partial<Record<AppRole, RoleBadgeConfig>> = {
  super_admin: {
    label: 'Super Admin',
    shortLabel: 'Admin',
    icon: Crown,
    colorClasses: 'bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-200 text-yellow-900 border-yellow-400 dark:from-yellow-800/50 dark:via-amber-700/30 dark:to-yellow-800/50 dark:text-yellow-200 dark:border-yellow-600',
    order: 1,
  },
  admin: {
    label: 'General Manager',
    shortLabel: 'GM',
    icon: Crown,
    colorClasses: 'bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 text-amber-900 border-amber-400 dark:from-amber-800/50 dark:via-orange-700/30 dark:to-amber-800/50 dark:text-amber-200 dark:border-amber-600',
    order: 2,
  },
  manager: {
    label: 'Manager',
    shortLabel: 'Mgr',
    icon: Shield,
    colorClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    order: 3,
  },
  stylist: {
    label: 'Stylist',
    shortLabel: 'Stylist',
    icon: Scissors,
    colorClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    order: 4,
  },
  receptionist: {
    label: 'Receptionist',
    shortLabel: 'Front',
    icon: Headset,
    colorClasses: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    order: 5,
  },
  assistant: {
    label: 'Assistant',
    shortLabel: 'Asst',
    icon: HandHelping,
    colorClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    order: 6,
  },
};

const FALLBACK_BADGE: RoleBadgeConfig = {
  label: 'Team Member',
  shortLabel: 'Team',
  icon: User,
  colorClasses: 'bg-muted text-muted-foreground border-border',
  order: 99,
};

export const ACCOUNT_OWNER_BADGE: RoleBadgeConfig = {
  label: 'Account Owner',
  shortLabel: 'Owner',
  icon: Gem,
  // Theme-aware: tints adapt to active dashboard theme via --primary token.
  // Light: soft primary wash + deep primary text; Dark: subtle wash + light primary text.
  colorClasses:
    'bg-[hsl(var(--primary)/0.12)] text-[color-mix(in_srgb,hsl(var(--primary))_45%,black)] border-[hsl(var(--primary)/0.35)] dark:bg-[hsl(var(--primary)/0.18)] dark:text-[color-mix(in_srgb,hsl(var(--primary))_85%,white)] dark:border-[hsl(var(--primary)/0.45)]',
  order: 0,
};

export function getRoleBadgeConfig(role: AppRole, dbColor?: string): RoleBadgeConfig {
  const base = ROLE_BADGE_MAP[role] ?? FALLBACK_BADGE;
  if (dbColor) {
    const colors = getRoleColorClasses(dbColor);
    return { ...base, colorClasses: `${colors.bg} ${colors.text}` };
  }
  return base;
}

/**
 * Build the full ordered array of role badges for a user.
 * Prepends "Account Owner" if `isPrimaryOwner` is true.
 */
export function buildRoleBadges(
  roles: AppRole[],
  isPrimaryOwner: boolean,
  dbColorMap?: Record<string, string>,
): RoleBadgeConfig[] {
  const badges: RoleBadgeConfig[] = [];

  if (isPrimaryOwner) {
    badges.push(ACCOUNT_OWNER_BADGE);
  }

  const roleBadges = roles
    .map(r => getRoleBadgeConfig(r, dbColorMap?.[r]))
    .filter((b): b is RoleBadgeConfig => !!b)
    .sort((a, b) => a.order - b.order);

  badges.push(...roleBadges);

  if (badges.length === 0) {
    badges.push(FALLBACK_BADGE);
  }

  return badges;
}
