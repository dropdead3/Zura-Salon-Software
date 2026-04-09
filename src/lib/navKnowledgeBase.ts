/**
 * Navigation Knowledge Base — structured, queryable registry of verified UI destinations.
 * Used by the grounding pipeline to provide deterministic navigation answers.
 */

export interface NavTab {
  id: string;
  label: string;
  purpose: string;
}

export interface NavWorkflow {
  task: string;
  steps: string[];
}

export interface NavDestination {
  id: string;
  label: string;
  path: string;
  section: 'Main' | 'My Tools' | 'Manage' | 'System' | 'Apps' | 'Sub-page';
  parent?: string;
  tabs?: NavTab[];
  purpose: string;
  keywords: string[];
  roles: string[];
  workflows?: NavWorkflow[];
}

const ALL_ROLES = ['super_admin', 'admin', 'manager', 'stylist', 'stylist_assistant', 'receptionist', 'booth_renter', 'bookkeeper', 'operations_assistant', 'admin_assistant', 'inventory_manager'];
const LEADERSHIP = ['super_admin', 'admin'];
const LEADERSHIP_PLUS_MANAGER = ['super_admin', 'admin', 'manager'];
const STAFF = ['stylist', 'stylist_assistant'];

export const NAV_DESTINATIONS: NavDestination[] = [
  // ─── Main ───
  {
    id: 'command-center',
    label: 'Command Center',
    path: '/dashboard',
    section: 'Main',
    purpose: 'Main dashboard with quick stats, pinned cards, hub links, and daily overview.',
    keywords: ['home', 'dashboard', 'main', 'command center', 'overview', 'start'],
    roles: ALL_ROLES,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    path: '/dashboard/schedule',
    section: 'Main',
    purpose: 'View and manage the appointment calendar.',
    keywords: ['schedule', 'calendar', 'appointments', 'booking', 'book'],
    roles: ALL_ROLES,
  },
  {
    id: 'team-chat',
    label: 'Team Chat',
    path: '/dashboard/team-chat',
    section: 'Main',
    purpose: 'Internal team messaging and communication.',
    keywords: ['chat', 'message', 'team chat', 'messaging', 'communicate'],
    roles: ALL_ROLES,
  },

  // ─── My Tools ───
  {
    id: 'todays-prep',
    label: "Today's Prep",
    path: '/dashboard/today-prep',
    section: 'My Tools',
    purpose: 'Daily appointment preparation checklist for stylists.',
    keywords: ['prep', 'today', 'preparation', 'checklist', 'daily'],
    roles: STAFF,
  },
  {
    id: 'my-mixing',
    label: 'My Mixing',
    path: '/dashboard/mixing',
    section: 'My Tools',
    purpose: 'Color mixing station for stylists.',
    keywords: ['mixing', 'color', 'formula', 'mix'],
    roles: STAFF,
  },
  {
    id: 'waitlist',
    label: 'Waitlist',
    path: '/dashboard/waitlist',
    section: 'My Tools',
    purpose: 'Walk-in waitlist management.',
    keywords: ['waitlist', 'walk-in', 'waiting', 'queue'],
    roles: ['super_admin', 'admin', 'manager', 'receptionist'],
  },
  {
    id: 'my-stats',
    label: 'My Stats',
    path: '/dashboard/stats',
    section: 'My Tools',
    purpose: 'Personal performance metrics and KPIs.',
    keywords: ['stats', 'statistics', 'performance', 'my stats', 'my performance', 'metrics'],
    roles: ALL_ROLES,
  },
  {
    id: 'my-pay',
    label: 'My Pay',
    path: '/dashboard/my-pay',
    section: 'My Tools',
    purpose: 'View pay statements, commission details, and earnings.',
    keywords: ['pay', 'payroll', 'commission', 'earnings', 'salary', 'my pay', 'paycheck'],
    roles: ALL_ROLES,
  },
  {
    id: 'training',
    label: 'Training',
    path: '/dashboard/training',
    section: 'My Tools',
    purpose: 'Video training modules and educational content.',
    keywords: ['training', 'learning', 'education', 'videos', 'courses'],
    roles: [...LEADERSHIP, 'manager', ...STAFF],
  },
  {
    id: 'program',
    label: 'New-Client Engine Program',
    path: '/dashboard/program',
    section: 'My Tools',
    purpose: 'Client acquisition and retention program for stylists.',
    keywords: ['program', 'new client', 'client engine', 'acquisition', 'retention'],
    roles: STAFF,
  },
  {
    id: 'leaderboard',
    label: 'Team Leaderboard',
    path: '/dashboard/leaderboard',
    section: 'My Tools',
    purpose: 'Team performance rankings and competitions.',
    keywords: ['leaderboard', 'rankings', 'competition', 'top performers'],
    roles: [...STAFF, 'receptionist', 'booth_renter'],
  },
  {
    id: 'shift-swaps',
    label: 'Shift Swaps',
    path: '/dashboard/shift-swaps',
    section: 'My Tools',
    purpose: 'Request and manage shift trades with teammates.',
    keywords: ['shift swap', 'trade shift', 'swap', 'shift change', 'schedule trade'],
    roles: [...STAFF, 'receptionist', 'booth_renter'],
  },
  {
    id: 'rewards',
    label: 'Rewards',
    path: '/dashboard/rewards',
    section: 'My Tools',
    purpose: 'Staff rewards program and recognition.',
    keywords: ['rewards', 'recognition', 'incentives', 'points'],
    roles: [...STAFF, 'receptionist'],
  },
  {
    id: 'ring-the-bell',
    label: 'Ring the Bell',
    path: '/dashboard/ring-the-bell',
    section: 'My Tools',
    purpose: 'Celebrate wins and achievements.',
    keywords: ['ring the bell', 'celebrate', 'achievement', 'win'],
    roles: STAFF,
  },
  {
    id: 'my-graduation',
    label: 'My Level Progress',
    path: '/dashboard/my-graduation',
    section: 'My Tools',
    purpose: 'Track graduation and level advancement progress.',
    keywords: ['graduation', 'level', 'progress', 'advancement', 'level up'],
    roles: STAFF,
  },

  // ─── Manage ───
  {
    id: 'analytics-hub',
    label: 'Analytics Hub',
    path: '/dashboard/admin/analytics',
    section: 'Manage',
    purpose: 'Comprehensive performance metrics, sales analytics, utilization reports, and KPI dashboards.',
    keywords: ['analytics', 'reports', 'metrics', 'data', 'sales', 'performance', 'kpi', 'utilization', 'revenue'],
    roles: LEADERSHIP_PLUS_MANAGER,
    tabs: [
      { id: 'sales', label: 'Sales', purpose: 'Revenue, goals, forecasting, and commission analytics.' },
      { id: 'operations', label: 'Operations', purpose: 'Appointments, client flow, staffing, and utilization.' },
      { id: 'marketing', label: 'Marketing', purpose: 'Campaign performance and marketing ROI.' },
      { id: 'campaigns', label: 'Campaigns', purpose: 'Active campaign tracking and results.' },
      { id: 'program', label: 'Program', purpose: 'New-Client Engine program analytics.' },
      { id: 'reports', label: 'Reports', purpose: 'Custom report builder and exports.' },
      { id: 'rent', label: 'Rent', purpose: 'Booth rental and day rate analytics.' },
    ],
    workflows: [
      { task: 'View sales performance', steps: ['Open Analytics Hub from Manage section in sidebar', 'Click the Sales tab', 'Review sales overview or drill into subtabs like Goals, Compare, Staff'] },
      { task: 'Check staff utilization', steps: ['Open Analytics Hub from Manage section in sidebar', 'Click the Operations tab', 'Select Staff Utilization subtab'] },
    ],
  },
  {
    id: 'report-generator',
    label: 'Report Generator',
    path: '/dashboard/admin/reports',
    section: 'Manage',
    purpose: 'Custom report builder for generating and exporting business reports.',
    keywords: ['report', 'reports', 'export', 'generate report', 'report builder'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'operations-hub',
    label: 'Operations Hub',
    path: '/dashboard/admin/team-hub',
    section: 'Manage',
    purpose: 'Team management, scheduling, announcements, recruiting, PTO, and performance reviews.',
    keywords: ['operations', 'team', 'team hub', 'manage team', 'staff management', 'announcements', 'recruiting', 'pto', 'performance review'],
    roles: LEADERSHIP_PLUS_MANAGER,
    workflows: [
      { task: 'View team directory', steps: ['Open Operations Hub from Manage section in sidebar', 'The Team Directory is accessible from within the hub'] },
      { task: 'Create announcement', steps: ['Open Operations Hub from Manage section in sidebar', 'Navigate to Announcements section', 'Click Create Announcement'] },
    ],
  },

  // ─── Apps ───
  {
    id: 'color-bar',
    label: 'Zura Color Bar',
    path: '/dashboard/admin/color-bar-settings',
    section: 'Apps',
    purpose: 'Color bar product management, inventory tracking, and backroom operations.',
    keywords: ['color bar', 'color', 'inventory', 'backroom', 'products'],
    roles: LEADERSHIP,
  },

  // ─── System ───
  {
    id: 'roles-controls-hub',
    label: 'Roles & Controls Hub',
    path: '/dashboard/admin/access-hub',
    section: 'System',
    purpose: 'Manage permissions, role assignments, invitations, and access control for the organization.',
    keywords: [
      'roles', 'permissions', 'access', 'access control', 'role permissions',
      'user roles', 'invite', 'invitation', 'invitations', 'invite staff',
      'invite team', 'add team member', 'add user', 'who has access',
      'manage roles', 'assign roles', 'role assignment', 'controls',
      'roles hub', 'roles and controls', 'access hub',
    ],
    roles: LEADERSHIP,
    tabs: [
      { id: 'permissions', label: 'Permissions', purpose: 'Configure what each role can see and do.' },
      { id: 'user-roles', label: 'User Roles', purpose: 'Assign and manage roles for individual users.' },
      { id: 'role-access', label: 'Role Access', purpose: 'View and edit role-based access rules.' },
      { id: 'invitations', label: 'Invitations', purpose: 'Send and manage team invitations.' },
      { id: 'modules', label: 'Modules', purpose: 'Configure module access per role.' },
      { id: 'chat-channels', label: 'Chat Channels', purpose: 'Manage chat channel permissions.' },
      { id: 'pinned-cards', label: 'Pinned Cards', purpose: 'Configure pinned card visibility per role.' },
      { id: 'role-config', label: 'Role Config', purpose: 'Advanced role configuration.' },
    ],
    workflows: [
      { task: 'Change user permissions', steps: ['Open Roles & Controls Hub from System section in sidebar', 'Click the Permissions tab', 'Select the role to edit', 'Toggle permissions on or off', 'Save changes'] },
      { task: 'Invite a team member', steps: ['Open Roles & Controls Hub from System section in sidebar', 'Click the Invitations tab', 'Click Send Invitation', 'Enter email and select role', 'Send'] },
      { task: 'Assign a role to a user', steps: ['Open Roles & Controls Hub from System section in sidebar', 'Click the User Roles tab', 'Find the user', 'Select the new role', 'Confirm'] },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/dashboard/admin/settings',
    section: 'System',
    purpose: 'Organization settings, integrations, billing, and configuration.',
    keywords: ['settings', 'configuration', 'integrations', 'billing', 'preferences', 'setup', 'config'],
    roles: LEADERSHIP,
    workflows: [
      { task: 'Change organization settings', steps: ['Open Settings from System section in sidebar', 'Find the relevant settings section', 'Make changes and save'] },
    ],
  },

  // ─── Sub-pages ───
  {
    id: 'team-directory',
    label: 'Team Directory',
    path: '/dashboard/directory',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'View all team members, their roles, and contact information.',
    keywords: ['team directory', 'staff list', 'team members', 'employee list', 'directory'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'client-directory',
    label: 'Client Directory',
    path: '/dashboard/clients',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Browse and manage client records.',
    keywords: ['clients', 'client list', 'client directory', 'customers', 'client search'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'appointments-transactions',
    label: 'Appointments & Transactions',
    path: '/dashboard/appointments-hub',
    section: 'Sub-page',
    parent: 'Analytics Hub',
    purpose: 'View appointment history and transaction records.',
    keywords: ['appointments', 'transactions', 'history', 'appointment history'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
];

/**
 * Find matching destinations for a query, filtered by user role.
 * Returns destinations sorted by relevance (keyword match count).
 */
export function findMatchingDestinations(query: string, userRole?: string): NavDestination[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(w => w.length > 2);

  const scored: { dest: NavDestination; score: number }[] = [];

  for (const dest of NAV_DESTINATIONS) {
    // Role filter: if userRole is provided, check access
    if (userRole && !dest.roles.includes(userRole)) continue;

    let score = 0;

    // Exact label match
    if (dest.label.toLowerCase().includes(q)) {
      score += 10;
    }

    // Keyword matches
    for (const kw of dest.keywords) {
      if (q.includes(kw)) {
        score += 5;
      } else {
        // Partial word overlap
        const kwWords = kw.split(/\s+/);
        for (const w of words) {
          if (kwWords.some(kw2 => kw2.includes(w) || w.includes(kw2))) {
            score += 2;
          }
        }
      }
    }

    // Tab keyword matches
    if (dest.tabs) {
      for (const tab of dest.tabs) {
        const tabLabel = tab.label.toLowerCase();
        if (q.includes(tabLabel)) score += 4;
        if (tab.purpose.toLowerCase().split(/\s+/).some(w => words.includes(w))) score += 1;
      }
    }

    // Workflow task matches
    if (dest.workflows) {
      for (const wf of dest.workflows) {
        const taskLower = wf.task.toLowerCase();
        if (q.includes(taskLower) || taskLower.includes(q)) {
          score += 6;
        } else {
          for (const w of words) {
            if (taskLower.includes(w)) score += 2;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ dest, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.dest);
}
