/**
 * Canonical dashboard navigation registry.
 * Consumed by DashboardLayout (sidebar), TopBarSearch, and HubQuickLinks.
 * When adding or renaming routes/labels, update this file and keep consumers in sync.
 * See .cursor/rules/navigation-agent.mdc for drill-down and back-to-source contracts.
 *
 * Duplicate-by-design: Some routes appear in more than one section (e.g. Schedule in Main and
 * Management; Stats/Leaderboard in My Performance and Management). Use consistent labels for
 * the same route across sections (e.g. "Schedule" everywhere; "Team Stats" / "Team Leaderboard"
 * in manager vs "My Stats" / "Team Leaderboard" in stats where the destination is the same).
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type AppRole = Database['public']['Enums']['app_role'];
type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

/** Manager section sub-group id; used to group manager nav items in the sidebar. */
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
  /** When set, item appears in the Management section under this sub-group. */
  managerGroup?: ManagerGroupId;
}

export const mainNavItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Command Center', labelKey: 'command_center', icon: LayoutDashboard, permission: 'view_command_center' },
  { href: '/dashboard/schedule', label: 'Schedule', labelKey: 'schedule', icon: CalendarDays, permission: 'view_booking_calendar', roles: ['super_admin', 'admin', 'manager', 'stylist', 'stylist_assistant', 'receptionist', 'assistant', 'admin_assistant', 'operations_assistant', 'booth_renter', 'bookkeeper'] },
  { href: '/dashboard/today-prep', label: "Today's Prep", labelKey: 'todays_prep', icon: ClipboardCheck, permission: 'view_booking_calendar', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/waitlist', label: 'Waitlist', labelKey: 'waitlist', icon: ClipboardList, permission: 'view_booking_calendar', roles: ['super_admin', 'admin', 'manager', 'receptionist'] },
  { href: '/dashboard/team-chat', label: 'Team Chat', labelKey: 'team_chat', icon: MessageSquare },
];

/**
 * Housekeeping (e.g. Onboarding) is optional/legacy: not included in DEFAULT_SECTION_ORDER.
 * It appears in the sidebar only when explicitly added to section order via the layout configurator or DB.
 */
export const housekeepingNavItems: DashboardNavItem[] = [
  { href: '/dashboard/onboarding', label: 'Onboarding', labelKey: 'onboarding', icon: Users, permission: 'view_onboarding' },
];

export const growthNavItems: DashboardNavItem[] = [
  { href: '/dashboard/training', label: 'Training', labelKey: 'training', icon: Video, permission: 'view_training', roles: ['admin', 'manager', 'stylist', 'stylist_assistant'] },
  { href: '/dashboard/program', label: 'New-Client Engine Program', labelKey: 'new_client_engine_program', icon: Target, permission: 'access_client_engine', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/ring-the-bell', label: 'Ring the Bell', labelKey: 'ring_the_bell', icon: Bell, permission: 'ring_the_bell', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/my-graduation', label: 'My Graduation', labelKey: 'my_graduation', icon: GraduationCap, permission: 'view_my_graduation', roles: ['stylist_assistant'] },
];

export const statsNavItems: DashboardNavItem[] = [
  { href: '/dashboard/stats', label: 'My Stats', labelKey: 'my_stats', icon: BarChart3, permission: 'view_own_stats', roles: ['stylist', 'stylist_assistant'] },
  { href: '/dashboard/leaderboard', label: 'Team Leaderboard', labelKey: 'team_leaderboard', icon: Trophy, permission: 'view_leaderboard', roles: ['stylist', 'stylist_assistant', 'receptionist', 'booth_renter'] },
  { href: '/dashboard/my-pay', label: 'My Pay', labelKey: 'my_pay', icon: Wallet, permission: 'view_my_pay' },
];

export const managerNavItems: DashboardNavItem[] = [
  
  { href: '/dashboard/shift-swaps', label: 'Shift Swaps', labelKey: 'shift_swaps', icon: ArrowLeftRight, roles: ['stylist', 'stylist_assistant', 'receptionist', 'booth_renter'], managerGroup: 'teamTools' },
  { href: '/dashboard/rewards', label: 'Rewards', labelKey: 'rewards', icon: Gift, roles: ['stylist', 'stylist_assistant', 'receptionist'], managerGroup: 'teamTools' },
  { href: '/dashboard/assistant-schedule', label: 'Assistant Scheduling', labelKey: 'assistant_scheduling', icon: Users, permission: 'view_assistant_schedule', managerGroup: 'teamTools' },
  { href: '/dashboard/schedule-meeting', label: 'Meetings & Accountability', labelKey: 'meetings_accountability', icon: CalendarClock, permission: 'schedule_meetings', managerGroup: 'teamTools' },
  { href: '/dashboard/admin/team', label: 'Program Team Overview', labelKey: 'program_team_overview', icon: Users, permission: 'view_team_overview', managerGroup: 'teamTools' },
  { href: '/dashboard/admin/analytics', label: 'Analytics Hub', labelKey: 'analytics_hub', icon: TrendingUp, permission: 'view_team_overview', managerGroup: 'analytics' },
  { href: '/dashboard/appointments-hub', label: 'Appointments & Transactions', labelKey: 'appointments_hub', icon: CalendarClock, permission: 'view_transactions', managerGroup: 'analytics' },
  { href: '/dashboard/campaigns', label: 'Campaigns', labelKey: 'campaigns', icon: Rocket, permission: 'view_team_overview', managerGroup: 'analytics' },
  
  { href: '/dashboard/admin/kpi-builder', label: 'KPI Architecture', labelKey: 'kpi_architecture', icon: Target, permission: 'manage_settings', managerGroup: 'analytics' },
  { href: '/dashboard/admin/decision-history', label: 'Decision History', labelKey: 'decision_history', icon: BarChart3, permission: 'manage_settings', managerGroup: 'analytics' },
  { href: '/dashboard/stats', label: 'Team Stats', labelKey: 'team_stats', icon: BarChart3, permission: 'view_all_stats', managerGroup: 'analytics' },
  { href: '/dashboard/leaderboard', label: 'Team Leaderboard', labelKey: 'team_leaderboard', icon: Trophy, permission: 'view_leaderboard', managerGroup: 'analytics' },
  { href: '/dashboard/directory', label: 'Team Directory', labelKey: 'team_directory', icon: Contact, permission: 'view_team_directory', managerGroup: 'people' },
  { href: '/dashboard/clients', label: 'Client Directory', labelKey: 'client_directory', icon: Users, permission: 'view_clients', managerGroup: 'people' },
  { href: '/dashboard/admin/booth-rental', label: 'Booth Rental', labelKey: 'booth_rental', icon: Armchair, permission: 'manage_booth_rental', managerGroup: 'people' },
  { href: '/dashboard/admin/inventory', label: 'Inventory', labelKey: 'inventory', icon: Package, permission: 'manage_inventory', managerGroup: 'operations' },
  { href: '/dashboard/admin/settings?category=website', label: 'Website Editor', labelKey: 'website_editor', icon: Globe, permission: 'manage_homepage_stylists', managerGroup: 'operations' },
  { href: '/dashboard/admin/seo-workshop', label: 'SEO Workshop', labelKey: 'seo_workshop', icon: Search, permission: 'view_team_overview', managerGroup: 'operations' },
  { href: '/dashboard/admin/management', label: 'Management Hub', labelKey: 'management_hub', icon: LayoutGrid, permission: 'view_team_overview', managerGroup: 'operations' },
];

export const adminOnlyNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/access-hub', label: 'Roles & Controls Hub', labelKey: 'roles_controls_hub', icon: Shield, permission: 'manage_settings' },
  { href: '/dashboard/admin/settings', label: 'Settings', labelKey: 'settings', icon: Settings, permission: 'manage_settings' },
];

export const footerNavItems: DashboardNavItem[] = [];
export const websiteNavItems: DashboardNavItem[] = [];

// --- Hub quick links (Management-style hubs) ---
export interface HubLinkConfig {
  href: string;
  icon: LucideIcon;
  label: string;
  colorClass: string;
  permission?: string;
}

export const hubLinksConfig: HubLinkConfig[] = [
  { href: '/dashboard/admin/analytics', icon: TrendingUp, label: 'Analytics Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/admin/management', icon: LayoutGrid, label: 'Management Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/admin/payroll', icon: DollarSign, label: 'Hiring & Payroll Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'manage_payroll' },
  { href: '/dashboard/admin/booth-renters', icon: Store, label: 'Renter Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'manage_booth_renters' },
  { href: '/dashboard/admin/settings?category=website', icon: Globe, label: 'Website Editor', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'manage_homepage_stylists' },
  { href: '/dashboard/admin/seo-workshop', icon: Search, label: 'SEO Workshop', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/campaigns', icon: Rocket, label: 'Campaigns', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/admin/feedback', icon: MessageSquarePlus, label: 'Feedback Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'manage_settings' },
  { href: '/dashboard/admin/access-hub', icon: Shield, label: 'Roles Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'manage_settings' },
  { href: '/dashboard/admin/onboarding-tracker', icon: ClipboardList, label: 'Onboarding Hub', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_team_overview' },
  { href: '/dashboard/schedule-meeting', icon: CalendarClock, label: 'Schedule 1:1', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'schedule_meetings' },
  { href: '/dashboard/appointments-hub', icon: Receipt, label: 'Appointments & Transactions', colorClass: 'bg-primary/5 text-primary hover:bg-primary/10', permission: 'view_transactions' },
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
