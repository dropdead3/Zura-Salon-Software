import { useMemo } from 'react';
import {
  LayoutDashboard, Users, BookOpen, Sparkles, UserCircle,
} from 'lucide-react';
import React from 'react';
import type { CommandResult } from './commandTypes';
import {
  mainNavItems,
  myToolsNavItems,
  manageNavItems,
  systemNavItems,
} from '@/config/dashboardNav';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';

// Hub children for deep-linking
const hubChildrenItems = [
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
  { href: '/dashboard/appointments-hub', label: 'Appointments & Transactions' },
  { href: '/dashboard/admin/sales', label: 'Sales Analytics' },
  { href: '/dashboard/admin/operational-analytics', label: 'Operational Analytics' },
  { href: '/dashboard/admin/staff-utilization', label: 'Staff Utilization' },
  { href: '/dashboard/admin/reports', label: 'Reports' },
  { href: '/dashboard/admin/day-rate-settings', label: 'Day Rate Settings' },
  { href: '/dashboard/admin/day-rate-calendar', label: 'Day Rate Calendar' },
];

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
  platformRoles?: string[];
}

interface UseCommandSearchOptions {
  filterNavItems?: (items: NavItem[]) => NavItem[];
}

function dedupeByHref<T extends { href: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach(item => { if (!map.has(item.href)) map.set(item.href, item); });
  return Array.from(map.values());
}

function scoreMatch(haystack: string, query: string): number {
  const lower = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  const idx = lower.indexOf(q);
  if (idx >= 0) return 60 - idx * 0.5;
  // Word-boundary match
  const words = lower.split(/\s+/);
  if (words.some(w => w.startsWith(q))) return 50;
  return 0;
}

export function useCommandSearch(query: string, options: UseCommandSearchOptions = {}) {
  const { data: teamMembers } = useTeamDirectory();

  const allNavItems = useMemo(() => {
    const combined = dedupeByHref([
      ...mainNavItems,
      ...myToolsNavItems,
      ...manageNavItems,
      ...systemNavItems,
      ...hubChildrenItems.map(h => ({ ...h, icon: LayoutDashboard })),
    ] as NavItem[]);
    return options.filterNavItems ? options.filterNavItems(combined) : combined;
  }, [options.filterNavItems]);

  const results = useMemo((): CommandResult[] => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    const out: CommandResult[] = [];

    // Navigation results
    allNavItems.forEach(item => {
      const score = scoreMatch(item.label, q);
      if (score > 0) {
        const Icon = item.icon;
        out.push({
          id: `nav-${item.href}`,
          type: 'navigation',
          title: item.label,
          path: item.href,
          icon: React.createElement(Icon, { className: 'w-4 h-4' }),
          score,
        });
      }
    });

    // Help results
    const helpItems = [
      { label: 'Profile', path: '/dashboard/profile', icon: UserCircle },
      { label: 'Help Center', path: '/dashboard/help', icon: BookOpen },
      { label: 'Handbooks', path: '/dashboard/handbooks', icon: BookOpen, subtitle: 'Employee guides & resources' },
      { label: "What's New", path: '/dashboard/changelog', icon: Sparkles, subtitle: 'Latest updates & features' },
    ];
    helpItems.forEach(item => {
      const score = scoreMatch(item.label + ' ' + (item.subtitle || ''), q);
      if (score > 0) {
        out.push({
          id: `help-${item.path}`,
          type: 'help',
          title: item.label,
          subtitle: item.subtitle,
          path: item.path,
          icon: React.createElement(item.icon, { className: 'w-4 h-4' }),
          score: score * 0.9, // Slightly lower priority than nav
        });
      }
    });

    // Team results
    teamMembers?.forEach(member => {
      const name = member.full_name || member.display_name || '';
      if (!name) return;
      const score = scoreMatch(name, q);
      if (score > 0) {
        out.push({
          id: `team-${member.user_id}`,
          type: 'team',
          title: name,
          subtitle: member.roles?.[0] || 'Team Member',
          path: `/dashboard/directory?search=${encodeURIComponent(name)}`,
          icon: React.createElement(Users, { className: 'w-4 h-4' }),
          metadata: member.location_name || undefined,
          score: score * 0.85,
        });
      }
    });

    // Sort by score desc, cap at 12
    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [query, allNavItems, teamMembers]);

  return { results };
}
