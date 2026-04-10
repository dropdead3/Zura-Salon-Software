/**
 * useProactiveIntelligence — Composes role-aware quick paths,
 * attention items, and recommended actions from existing hooks
 * for the command surface default state.
 */

import { useMemo } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useAIInsights, type InsightItem, type ActionItem } from '@/hooks/useAIInsights';
import {
  mainNavItems,
  myToolsNavItems,
  manageNavItems,
  systemNavItems,
  type DashboardNavItem,
} from '@/config/dashboardNav';
import type { LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickPath {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AttentionItem {
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  category: string;
  /** Suggested destination path if determinable */
  destinationHint?: string;
}

export interface RecommendedAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProactiveIntelligence {
  quickPaths: QuickPath[];
  attentionItems: AttentionItem[];
  recommendedActions: RecommendedAction[];
  isLoading: boolean;
}

// ─── Role → preferred nav paths (static, ordered by relevance) ───────────────

const ROLE_PATH_PREFERENCES: Record<string, string[]> = {
  receptionist: [
    '/dashboard/schedule',
    '/dashboard/clients',
    '/dashboard/waitlist',
    '/dashboard/appointments-hub',
    '/dashboard/transactions',
  ],
  assistant: [
    '/dashboard/schedule',
    '/dashboard/clients',
    '/dashboard/waitlist',
    '/dashboard/appointments-hub',
    '/dashboard/transactions',
  ],
  admin_assistant: [
    '/dashboard/schedule',
    '/dashboard/clients',
    '/dashboard/waitlist',
    '/dashboard/appointments-hub',
    '/dashboard/transactions',
  ],
  stylist: [
    '/dashboard/stats',
    '/dashboard/schedule',
    '/dashboard/today-prep',
    '/dashboard/my-pay',
  ],
  stylist_assistant: [
    '/dashboard/stats',
    '/dashboard/schedule',
    '/dashboard/today-prep',
    '/dashboard/my-pay',
  ],
  manager: [
    '/dashboard/admin/analytics',
    '/dashboard/admin/team-hub',
    '/dashboard/admin/staff-utilization',
    '/dashboard/schedule',
  ],
  admin: [
    '/dashboard/admin/analytics',
    '/dashboard/admin/team-hub',
    '/dashboard/admin/access-hub',
    '/dashboard/admin/settings',
    '/dashboard/admin/reports',
  ],
  super_admin: [
    '/dashboard/admin/analytics',
    '/dashboard/admin/team-hub',
    '/dashboard/admin/access-hub',
    '/dashboard/admin/settings',
    '/dashboard/admin/reports',
  ],
  booth_renter: [
    '/dashboard/stats',
    '/dashboard/schedule',
    '/dashboard/my-pay',
    '/dashboard/leaderboard',
  ],
  bookkeeper: [
    '/dashboard/admin/analytics',
    '/dashboard/admin/reports',
    '/dashboard/schedule',
  ],
  operations_assistant: [
    '/dashboard/schedule',
    '/dashboard/admin/team-hub',
    '/dashboard/waitlist',
    '/dashboard/appointments-hub',
    '/dashboard/transactions',
  ],
};

const DEFAULT_PATHS = [
  '/dashboard',
  '/dashboard/schedule',
  '/dashboard/team-chat',
];

// ─── Build nav lookup ────────────────────────────────────────────────────────

const ALL_NAV_ITEMS: DashboardNavItem[] = [
  ...mainNavItems,
  ...myToolsNavItems,
  ...manageNavItems,
  ...systemNavItems,
];

const NAV_BY_HREF = new Map<string, DashboardNavItem>();
ALL_NAV_ITEMS.forEach((item) => {
  if (!NAV_BY_HREF.has(item.href)) NAV_BY_HREF.set(item.href, item);
});

// ─── Category → destination hint ─────────────────────────────────────────────

const CATEGORY_DESTINATION: Record<string, string> = {
  revenue_pulse: '/dashboard/admin/analytics?tab=revenue',
  cash_flow: '/dashboard/admin/analytics?tab=revenue',
  capacity: '/dashboard/admin/staff-utilization',
  staffing: '/dashboard/admin/team-hub',
  client_health: '/dashboard/admin/client-health',
  anomaly: '/dashboard/admin/analytics',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProactiveIntelligence(): ProactiveIntelligence {
  const { can } = usePermission();
  const effectiveRoles = useEffectiveRoles() as string[];
  const { data: insightsData, isLoading } = useAIInsights();

  // Quick paths: resolve role preferences → nav items, permission-gated
  const quickPaths = useMemo<QuickPath[]>(() => {
    // Collect preferred paths from all effective roles
    const seen = new Set<string>();
    const paths: string[] = [];

    for (const role of effectiveRoles) {
      const prefs = ROLE_PATH_PREFERENCES[role] || DEFAULT_PATHS;
      for (const p of prefs) {
        if (!seen.has(p)) {
          seen.add(p);
          paths.push(p);
        }
      }
    }

    // If no roles matched, use defaults
    if (paths.length === 0) {
      DEFAULT_PATHS.forEach((p) => { if (!seen.has(p)) paths.push(p); });
    }

    // Resolve to nav items, filter by permission
    return paths
      .map((href) => NAV_BY_HREF.get(href))
      .filter((item): item is DashboardNavItem => {
        if (!item) return false;
        if (item.permission && !can(item.permission)) return false;
        return true;
      })
      .slice(0, 6)
      .map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
      }));
  }, [effectiveRoles, can]);

  // Attention items: top 3 warning/critical insights by priorityScore
  const attentionItems = useMemo<AttentionItem[]>(() => {
    if (!insightsData?.insights) return [];

    return (insightsData.insights as InsightItem[])
      .filter((i) => i.severity === 'warning' || i.severity === 'critical')
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
      .slice(0, 3)
      .map((i) => ({
        title: i.title,
        description: i.description,
        severity: i.severity as 'warning' | 'critical',
        category: i.category,
        destinationHint: CATEGORY_DESTINATION[i.category],
      }));
  }, [insightsData?.insights]);

  // Recommended actions: top 3 by priority
  const recommendedActions = useMemo<RecommendedAction[]>(() => {
    if (!insightsData?.actionItems) return [];

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...(insightsData.actionItems as ActionItem[])]
      .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))
      .slice(0, 3)
      .map((a) => ({
        action: a.action,
        priority: a.priority,
      }));
  }, [insightsData?.actionItems]);

  return {
    quickPaths,
    attentionItems,
    recommendedActions,
    isLoading,
  };
}
