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
      { href: '/dashboard/platform/overview', label: 'Overview', icon: Terminal },
      { href: '/dashboard/platform/accounts', label: 'Accounts', icon: Building2 },
      { href: '/dashboard/platform/health-scores', label: 'Health Scores', icon: Activity, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/dashboard/platform/benchmarks', label: 'Benchmarks', icon: BarChart3, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/platform/onboarding', label: 'Onboarding', icon: Rocket, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/dashboard/platform/import', label: 'Migrations', icon: Upload },
      { href: '/dashboard/platform/jobs', label: 'Scheduled Jobs', icon: Clock, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/dashboard/platform/coach', label: 'Coach Dashboard', icon: Users },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/dashboard/platform/audit-log', label: 'Activity Log', icon: FileText, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/dashboard/platform/health', label: 'System Health', icon: Activity, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/dashboard/platform/stripe-health', label: 'Payments Health', icon: CreditCard, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
      { href: '/dashboard/platform/notifications', label: 'Notifications', icon: Bell, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/dashboard/platform/analytics', label: 'Analytics', icon: BarChart3, platformRoles: ['platform_owner'] },
      { href: '/dashboard/platform/knowledge-base', label: 'Knowledge Base', icon: BookOpen, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/dashboard/platform/revenue', label: 'Revenue', icon: DollarSign, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/dashboard/platform/billing-guide', label: 'Billing Guide', icon: HelpCircle, platformRoles: ['platform_owner', 'platform_admin', 'platform_support'] },
    ],
  },
  {
    label: 'Products',
    items: [
      { href: '/dashboard/platform/backroom', label: 'Backroom', icon: Package, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/dashboard/platform/permissions', label: 'Permissions', icon: Shield, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/dashboard/platform/feature-flags', label: 'Feature Flags', icon: Flag, platformRoles: ['platform_owner', 'platform_admin'] },
      { href: '/dashboard/platform/settings', label: 'Settings', icon: Settings, platformRoles: ['platform_owner', 'platform_admin'] },
    ],
  },
];
