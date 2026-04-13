/**
 * Canonical platform navigation. Consumed by PlatformSidebar.
 * When adding or renaming platform routes, update this file and App.tsx.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Terminal,
  Building2,
  HelpCircle,
  Upload,
  DollarSign,
  Shield,
  Settings,
  BookOpen,
  Rocket,
  BarChart3,
  FileText,
  Clock,
  Activity,
  Bell,
  CreditCard,
  Flag,
  Package,
  Users,
  Landmark,
} from 'lucide-react';

export type PlatformNavRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

export interface PlatformNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  platformRoles?: PlatformNavRole[];
}

export interface PlatformNavGroup {
  label: string;
  items: PlatformNavItem[];
}

export const platformNavGroups: PlatformNavGroup[] = [
  {
    label: 'Core',
    items: [
      { href: '/platform/overview', label: 'Overview', icon: Terminal },
      { href: '/platform/accounts', label: 'Accounts', icon: Building2 },
      { href: '/platform/health-scores', label: 'Health Scores', icon: Activity, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/platform/benchmarks', label: 'Benchmarks', icon: BarChart3, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/platform/onboarding', label: 'Onboarding', icon: Rocket, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/platform/import', label: 'Migrations', icon: Upload },
      { href: '/platform/jobs', label: 'Scheduled Jobs', icon: Clock, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/platform/coach', label: 'Coach Dashboard', icon: Users },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/platform/audit-log', label: 'Activity Log', icon: FileText, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/platform/health', label: 'System Health', icon: Activity, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/platform/payments-health', label: 'Payments Health', icon: CreditCard, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/platform/notifications', label: 'Notifications', icon: Bell, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/platform/analytics', label: 'Analytics', icon: BarChart3, platformRoles: ['platform_owner'] },
      { href: '/platform/network', label: 'Zura Network', icon: Building2, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/platform/knowledge-base', label: 'Knowledge Base', icon: BookOpen, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/platform/revenue', label: 'Revenue', icon: DollarSign, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/platform/billing-guide', label: 'Billing Guide', icon: HelpCircle, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
    ],
  },
  {
    label: 'Products',
    items: [
      { href: '/platform/color-bar', label: 'Color Bar', icon: Package, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Special Features',
    items: [
      { href: '/platform/capital', label: 'Zura Capital', icon: Landmark, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/platform/permissions', label: 'Permissions', icon: Shield, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/platform/feature-flags', label: 'Feature Flags', icon: Flag, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/platform/settings', label: 'Settings', icon: Settings, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
];
