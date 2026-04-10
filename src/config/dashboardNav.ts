/**
 * Canonical dashboard navigation registry.
 * Consumed by DashboardLayout (sidebar), TopBarSearch, and HubQuickLinks.
 * When adding or renaming routes/labels, update this file and keep consumers in sync.
 * See .cursor/rules/navigation-agent.mdc for drill-down and back-to-source contracts.
 *
 * Section architecture (post-consolidation):
 *   main       – Locked top 3 (Command Center, Schedule, Team Chat)
 *   myTools    – Staff-facing daily tools (stats, pay, training, swaps, rewards)
 *   manage     – Admin hub entry points only (Analytics, Team, Client, Growth, Payroll, Renter)
 *   system     – Admin config (Roles Hub, Settings)
 *   platform   – Platform admin (separate layout)
 */
import type { Database } from '@/integrations/supabase/types';
import {
  LayoutDashboard,
  LayoutGrid,
  ClipboardCheck,
  CalendarDays,
  MessageSquare,
  MessageSquarePlus,
  Users,
  ClipboardList,
  Video,
  Target,
  Bell,
  GraduationCap,
  BarChart3,
  Trophy,
  Wallet,
  ArrowLeftRight,
  Gift,
  CalendarClock,
  Contact,
  TrendingUp,
  Rocket,
  HeartPulse,
  DollarSign,
  Store,
  Globe,
  Shield,
  Settings,
  Search,
  Receipt,
  Armchair,
  Package,
  Beaker,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type AppRole = Database['public']['Enums']['app_role'];
type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

/** @deprecated Manager sub-groups removed in nav consolidation. Kept for type compatibility. */
export type ManagerGroupId = 'teamTools' | 'analytics' | 'people' | 'operations';

export interface DashboardNavItem {
  href: string;
  label: string;
  /** i18n key under dashboard.nav (e.g. 'command_center'). When set, sidebar uses t('dashboard:nav.<labelKey>'). */
  labelKey?: string;
  icon: LucideIcon;
  permission?: string;
  roles?: AppRole[];
  platformRoles?: PlatformRole[];
  /** @deprecated No longer used — manager sub-groups removed in nav consolidation. */
  managerGroup?: ManagerGroupId;
}

// ─── SECTION: main (locked top 3 + daily execution) ─────────────────────────

export const mainNavItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Command Center', labelKey: 'command_center', icon: LayoutDashboard, permission: 'view_command_center' },
  { href: '/dashboard/schedule', label: 'Schedule', labelKey: 'schedule', icon: CalendarDays, permission: 'view_booking_calendar', roles: ['super_admin', 'admin', 'manager', 'stylist', 'stylist_assistant', 'receptionist', 'assistant', 'admin_assistant', 'operations_assistant', 'booth_renter', 'bookkeeper'] },
  { href: '/dashboard/transactions', label: 'Transactions', labelKey: 'transactions', icon: Receipt, permission: 'view_transactions' },
  { href: '/dashboard/team-chat', label: 'Team Chat', labelKey: 'team_chat', icon: MessageSquare },
];

// ─── SECTION: myTools (staff-facing, replaces growth + stats) ────────────────

export const myToolsNavItems: DashboardNavItem[] = [
  { href: '/dashboard/today-prep', label: "Today's Prep", labelKey: 'todays_prep', icon: ClipboardCheck, permission: 'view_booking_calendar', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/mixing', label: 'My Mixing', labelKey: 'my_mixing', icon: Beaker, roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/waitlist', label: 'Waitlist', labelKey: 'waitlist', icon: ClipboardList, permission: 'view_booking_calendar', roles: ['super_admin', 'admin', 'manager', 'receptionist'] },
  { href: '/dashboard/stats', label: 'My Stats', labelKey: 'my_stats', icon: BarChart3, permission: 'view_own_stats' },
  { href: '/dashboard/my-pay', label: 'My Pay', labelKey: 'my_pay', icon: Wallet, permission: 'view_my_pay' },
  { href: '/dashboard/training', label: 'Training', labelKey: 'training', icon: Video, permission: 'view_training', roles: ['admin', 'manager', 'stylist', 'stylist_assistant'] },
  { href: '/dashboard/program', label: 'New-Client Engine Program', labelKey: 'new_client_engine_program', icon: Target, permission: 'access_client_engine', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/leaderboard', label: 'Team Leaderboard', labelKey: 'team_leaderboard', icon: Trophy, permission: 'view_leaderboard', roles: ['stylist', 'stylist_assistant', 'receptionist', 'booth_renter'] },
  { href: '/dashboard/shift-swaps', label: 'Shift Swaps', labelKey: 'shift_swaps', icon: ArrowLeftRight, roles: ['stylist', 'stylist_assistant', 'receptionist', 'booth_renter'] },
  { href: '/dashboard/rewards', label: 'Rewards', labelKey: 'rewards', icon: Gift, roles: ['stylist', 'stylist_assistant', 'receptionist'] },
  { href: '/dashboard/ring-the-bell', label: 'Ring the Bell', labelKey: 'ring_the_bell', icon: Bell, permission: 'ring_the_bell', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/my-graduation', label: 'My Level Progress', labelKey: 'my_graduation', icon: GraduationCap, permission: 'view_my_graduation', roles: ['stylist', 'stylist_assistant'] },
];

// ─── SECTION: manage (admin hub-only links) ──────────────────────────────────

export const manageNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/analytics', label: 'Analytics Hub', labelKey: 'analytics_hub', icon: TrendingUp, permission: 'view_team_overview' },
  { href: '/dashboard/admin/reports', label: 'Report Generator', labelKey: 'report_generator', icon: FileText, permission: 'view_team_overview' },
  { href: '/dashboard/admin/team-hub', label: 'Operations Hub', labelKey: 'team_hub', icon: Users, permission: 'view_team_overview' },
];

// ─── SECTION: apps (org-activated add-ons) ───────────────────────────────────

export const appsNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/color-bar-settings', label: 'Zura Color Bar', icon: Package, permission: 'manage_settings' },
];

// ─── SECTION: system (admin config) ──────────────────────────────────────────

export const systemNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/access-hub', label: 'Roles & Controls Hub', labelKey: 'roles_controls_hub', icon: Shield, permission: 'manage_settings' },
  { href: '/dashboard/admin/settings', label: 'Settings', labelKey: 'settings', icon: Settings, permission: 'manage_settings' },
];

// ─── LEGACY EXPORTS (backward compatibility) ─────────────────────────────────
// These are re-exported so existing code that imports them doesn't break.
// They map to the new section items.

/** @deprecated Use myToolsNavItems instead. Growth items merged into myTools. */
export const growthNavItems: DashboardNavItem[] = [
  { href: '/dashboard/training', label: 'Training', labelKey: 'training', icon: Video, permission: 'view_training', roles: ['admin', 'manager', 'stylist', 'stylist_assistant'] },
  { href: '/dashboard/program', label: 'New-Client Engine Program', labelKey: 'new_client_engine_program', icon: Target, permission: 'access_client_engine', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/ring-the-bell', label: 'Ring the Bell', labelKey: 'ring_the_bell', icon: Bell, permission: 'ring_the_bell', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/my-graduation', label: 'My Level Progress', labelKey: 'my_graduation', icon: GraduationCap, permission: 'view_my_graduation', roles: ['stylist', 'stylist_assistant'] },
];

/** @deprecated Use myToolsNavItems instead. Stats items merged into myTools. */
export const statsNavItems: DashboardNavItem[] = [
  { href: '/dashboard/stats', label: 'My Stats', labelKey: 'my_stats', icon: BarChart3, permission: 'view_own_stats', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/leaderboard', label: 'Team Leaderboard', labelKey: 'team_leaderboard', icon: Trophy, permission: 'view_leaderboard', roles: ['stylist', 'stylist_assistant', 'receptionist', 'booth_renter'] },
  { href: '/dashboard/my-pay', label: 'My Pay', labelKey: 'my_pay', icon: Wallet, permission: 'view_my_pay' },
];

/** @deprecated Use manageNavItems instead. Manager items consolidated into hub links. */
export const managerNavItems: DashboardNavItem[] = manageNavItems;

/** @deprecated Use systemNavItems instead. */
export const adminOnlyNavItems: DashboardNavItem[] = systemNavItems;

/**
 * Housekeeping (e.g. Onboarding) is optional/legacy: not included in DEFAULT_SECTION_ORDER.
 * It appears in the sidebar only when explicitly added to section order via the layout configurator or DB.
 */
export const housekeepingNavItems: DashboardNavItem[] = [
  { href: '/dashboard/onboarding', label: 'Onboarding', labelKey: 'onboarding', icon: Users, permission: 'view_onboarding' },
];

export const footerNavItems: DashboardNavItem[] = [];
export const websiteNavItems: DashboardNavItem[] = [];

// ─── Hub children for deep-link search candidates ───────────────────────────

export const hubChildrenItems: { href: string; label: string }[] = [
  { href: '/dashboard/directory', label: 'Team Directory' },
  { href: '/dashboard/admin/performance-reviews', label: 'Performance Reviews' },
  { href: '/dashboard/admin/pto', label: 'PTO Balances' },
  { href: '/dashboard/admin/announcements', label: 'Announcements' },
  { href: '/dashboard/admin/recruiting', label: 'Recruiting Pipeline' },
  { href: '/dashboard/admin/graduation-tracker', label: 'Graduation Tracker' },
  { href: '/dashboard/admin/stylist-levels', label: 'Stylist Levels' },
  { href: '/dashboard/admin/headshots', label: 'Headshot Requests' },
  { href: '/dashboard/admin/business-cards', label: 'Business Card Requests' },
  { href: '/dashboard/schedule-meeting', label: 'Schedule 1:1' },
  { href: '/dashboard/admin/training-hub', label: 'Training Hub' },
  { href: '/dashboard/clients', label: 'Client Directory' },
  { href: '/dashboard/admin/client-health', label: 'Client Health' },
  { href: '/dashboard/admin/reengagement', label: 'Re-engagement' },
  { href: '/dashboard/admin/feedback', label: 'Client Feedback' },
  { href: '/dashboard/campaigns', label: 'Campaigns' },
  { href: '/dashboard/admin/seo-workshop', label: 'SEO Workshop' },
  { href: '/dashboard/admin/leads', label: 'Lead Management' },
  { href: '/dashboard/appointments-hub', label: 'Appointments' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/admin/sales', label: 'Sales Analytics' },
  { href: '/dashboard/admin/operational-analytics', label: 'Operational Analytics' },
  { href: '/dashboard/admin/staff-utilization', label: 'Staff Utilization' },
  { href: '/dashboard/admin/reports', label: 'Reports' },
  { href: '/dashboard/admin/day-rate-settings', label: 'Day Rate Settings' },
  { href: '/dashboard/admin/day-rate-calendar', label: 'Day Rate Calendar' },
];

// --- Hub quick links (Command Center surface) ---
export interface HubLinkConfig {
  href: string;
  icon: LucideIcon;
  label: string;
  colorClass: string;
  permission?: string;
}

export const hubLinksConfig: HubLinkConfig[] = [
  { href: '/dashboard/admin/analytics', icon: TrendingUp, label: 'Analytics Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/admin/team-hub', icon: Users, label: 'Operations Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/admin/access-hub', icon: Shield, label: 'Roles & Controls Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'manage_settings' },
];

/** Canonical Analytics Hub base path. Use with ?tab= and &subtab= for drill-downs. */
export const ANALYTICS_HUB_PATH = '/dashboard/admin/analytics';

/** Build Analytics Hub URL with tab and optional subtab. Use for summary-card drill-downs. */
export function analyticsHubUrl(tab: string, subtab?: string): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (subtab) params.set('subtab', subtab);
  return `${ANALYTICS_HUB_PATH}?${params.toString()}`;
}
