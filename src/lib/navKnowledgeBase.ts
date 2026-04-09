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
  section: 'Main' | 'My Tools' | 'Manage' | 'System' | 'Apps' | 'Sub-page' | 'Platform';
  parent?: string;
  tabs?: NavTab[];
  purpose: string;
  keywords: string[];
  roles: string[];
  workflows?: NavWorkflow[];
}

export interface TaskRegistryEntry {
  intents: string[];
  destinationId: string;
  workflow?: NavWorkflow;
}

const ALL_ROLES = ['super_admin', 'admin', 'manager', 'stylist', 'stylist_assistant', 'receptionist', 'booth_renter', 'bookkeeper', 'operations_assistant', 'admin_assistant', 'inventory_manager'];
const LEADERSHIP = ['super_admin', 'admin'];
const LEADERSHIP_PLUS_MANAGER = ['super_admin', 'admin', 'manager'];
const STAFF = ['stylist', 'stylist_assistant'];
const PLATFORM_ROLES = ['platform_owner', 'platform_admin', 'platform_support', 'platform_developer'];

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

  // ─── Sub-pages (Operations Hub children) ───
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
    id: 'performance-reviews',
    label: 'Performance Reviews',
    path: '/dashboard/admin/performance-reviews',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Conduct and manage structured performance reviews for team members.',
    keywords: ['performance review', 'review', 'evaluation', 'appraisal', 'feedback', 'staff review'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'pto-balances',
    label: 'PTO Balances',
    path: '/dashboard/admin/pto',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Manage paid time off balances, requests, and approvals.',
    keywords: ['pto', 'time off', 'vacation', 'sick leave', 'paid time off', 'leave', 'absence', 'days off'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'announcements',
    label: 'Announcements',
    path: '/dashboard/admin/announcements',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Create and manage team-wide announcements.',
    keywords: ['announcement', 'announcements', 'news', 'broadcast', 'notify team', 'team update'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'recruiting',
    label: 'Recruiting Pipeline',
    path: '/dashboard/admin/recruiting',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Manage recruiting pipeline, job applications, and candidate tracking.',
    keywords: ['recruiting', 'hiring', 'candidates', 'applications', 'pipeline', 'job posting', 'hire'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'graduation-tracker',
    label: 'Graduation Tracker',
    path: '/dashboard/admin/graduation-tracker',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Track stylist level advancement and graduation milestones.',
    keywords: ['graduation', 'tracker', 'level advancement', 'promotion', 'stylist levels'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'stylist-levels',
    label: 'Stylist Levels',
    path: '/dashboard/admin/stylist-levels',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Define and configure the stylist level structure (titles, requirements, pricing).',
    keywords: ['stylist levels', 'level editor', 'level structure', 'tier', 'pricing tiers'],
    roles: LEADERSHIP,
  },
  {
    id: 'headshots',
    label: 'Headshot Requests',
    path: '/dashboard/admin/headshots',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Manage staff headshot photo requests.',
    keywords: ['headshot', 'photo', 'headshots', 'staff photo'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'business-cards',
    label: 'Business Card Requests',
    path: '/dashboard/admin/business-cards',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Manage business card ordering and requests.',
    keywords: ['business card', 'cards', 'business cards', 'print'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'schedule-meeting',
    label: 'Schedule 1:1',
    path: '/dashboard/schedule-meeting',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Schedule and manage one-on-one meetings with team members.',
    keywords: ['1:1', 'one on one', 'meeting', 'schedule meeting', '1-on-1', 'coach'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'training-hub',
    label: 'Training Hub',
    path: '/dashboard/admin/training-hub',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Manage training content, modules, and assignments for the team.',
    keywords: ['training hub', 'manage training', 'training admin', 'training content', 'courses admin'],
    roles: LEADERSHIP,
  },

  // ─── Sub-pages (Client-facing) ───
  {
    id: 'client-directory',
    label: 'Client Directory',
    path: '/dashboard/clients',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Browse and manage client records.',
    keywords: ['clients', 'client list', 'client directory', 'customers', 'client search', 'client records'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'client-health',
    label: 'Client Health',
    path: '/dashboard/admin/client-health',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Monitor client retention health scores, at-risk clients, and engagement trends.',
    keywords: ['client health', 'retention', 'at-risk', 'churn', 'client risk', 'engagement'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'reengagement',
    label: 'Re-engagement',
    path: '/dashboard/admin/reengagement',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Manage client re-engagement campaigns for lapsed or at-risk clients.',
    keywords: ['re-engagement', 'reengagement', 'win back', 'lapsed clients', 'bring back'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'client-feedback',
    label: 'Client Feedback',
    path: '/dashboard/admin/feedback',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Review and manage client feedback and satisfaction surveys.',
    keywords: ['feedback', 'reviews', 'satisfaction', 'survey', 'client feedback', 'nps'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },

  // ─── Sub-pages (Marketing) ───
  {
    id: 'campaigns',
    label: 'Campaigns',
    path: '/dashboard/campaigns',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Create and manage marketing campaigns.',
    keywords: ['campaigns', 'marketing', 'campaign', 'ads', 'promotions', 'marketing campaign'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'seo-workshop',
    label: 'SEO Workshop',
    path: '/dashboard/admin/seo-workshop',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Tasks and guides to improve local search visibility and Google rankings.',
    keywords: ['seo', 'search engine', 'google', 'local seo', 'search visibility', 'google business'],
    roles: LEADERSHIP,
  },
  {
    id: 'lead-management',
    label: 'Lead Management',
    path: '/dashboard/admin/leads',
    section: 'Sub-page',
    parent: 'Operations Hub',
    purpose: 'Track, assign, and convert salon inquiries from all sources.',
    keywords: ['leads', 'lead', 'inquiries', 'lead management', 'prospects', 'conversions'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },

  // ─── Sub-pages (Analytics Hub children) ───
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
  {
    id: 'sales-analytics',
    label: 'Sales Analytics',
    path: '/dashboard/admin/sales',
    section: 'Sub-page',
    parent: 'Analytics Hub',
    purpose: 'Detailed sales performance breakdowns, revenue trends, and goal tracking.',
    keywords: ['sales analytics', 'sales data', 'revenue breakdown', 'sales reports'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'operational-analytics',
    label: 'Operational Analytics',
    path: '/dashboard/admin/operational-analytics',
    section: 'Sub-page',
    parent: 'Analytics Hub',
    purpose: 'Operational metrics including appointment flow, no-shows, and capacity.',
    keywords: ['operational analytics', 'operations data', 'no-shows', 'capacity', 'appointment flow'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'staff-utilization',
    label: 'Staff Utilization',
    path: '/dashboard/admin/staff-utilization',
    section: 'Sub-page',
    parent: 'Analytics Hub',
    purpose: 'Monitor staff utilization rates, availability, and booking efficiency.',
    keywords: ['utilization', 'staff utilization', 'availability', 'booking efficiency', 'utilization rate'],
    roles: LEADERSHIP_PLUS_MANAGER,
  },
  {
    id: 'day-rate-settings',
    label: 'Day Rate Settings',
    path: '/dashboard/admin/day-rate-settings',
    section: 'Sub-page',
    parent: 'Analytics Hub',
    purpose: 'Configure day rate pricing and booth rental fee structures.',
    keywords: ['day rate', 'booth rent', 'rental rate', 'day rate settings', 'booth pricing'],
    roles: LEADERSHIP,
  },
  {
    id: 'day-rate-calendar',
    label: 'Day Rate Calendar',
    path: '/dashboard/admin/day-rate-calendar',
    section: 'Sub-page',
    parent: 'Analytics Hub',
    purpose: 'Calendar view of booth rental day rates and availability.',
    keywords: ['day rate calendar', 'rental calendar', 'booth calendar'],
    roles: LEADERSHIP,
  },

  // ─── Platform Admin ───
  {
    id: 'platform-overview',
    label: 'Platform Overview',
    path: '/platform/overview',
    section: 'Platform',
    purpose: 'Platform-wide dashboard with account metrics and system health.',
    keywords: ['platform', 'platform overview', 'admin', 'platform dashboard'],
    roles: PLATFORM_ROLES,
  },
  {
    id: 'platform-accounts',
    label: 'Accounts',
    path: '/platform/accounts',
    section: 'Platform',
    purpose: 'View and manage all organization accounts on the platform.',
    keywords: ['accounts', 'organizations', 'tenants', 'platform accounts'],
    roles: PLATFORM_ROLES,
  },
  {
    id: 'platform-health-scores',
    label: 'Health Scores',
    path: '/platform/health-scores',
    section: 'Platform',
    purpose: 'Platform-wide account health scoring and risk analysis.',
    keywords: ['health scores', 'account health', 'platform health'],
    roles: ['platform_owner', 'platform_admin', 'platform_support'],
  },
  {
    id: 'platform-onboarding',
    label: 'Onboarding',
    path: '/platform/onboarding',
    section: 'Platform',
    purpose: 'Manage new account onboarding workflows.',
    keywords: ['onboarding', 'new account', 'setup'],
    roles: ['platform_owner', 'platform_admin', 'platform_support'],
  },
  {
    id: 'platform-knowledge-base',
    label: 'Knowledge Base',
    path: '/platform/knowledge-base',
    section: 'Platform',
    purpose: 'Platform knowledge base and documentation management.',
    keywords: ['knowledge base', 'documentation', 'help articles'],
    roles: ['platform_owner', 'platform_admin'],
  },
  {
    id: 'platform-permissions',
    label: 'Platform Permissions',
    path: '/platform/permissions',
    section: 'Platform',
    purpose: 'Manage platform-level user permissions and access.',
    keywords: ['platform permissions', 'platform roles', 'platform access'],
    roles: ['platform_owner', 'platform_admin'],
  },
  {
    id: 'platform-settings',
    label: 'Platform Settings',
    path: '/platform/settings',
    section: 'Platform',
    purpose: 'Platform-wide configuration and settings.',
    keywords: ['platform settings', 'platform config'],
    roles: ['platform_owner', 'platform_admin'],
  },
  {
    id: 'platform-feature-flags',
    label: 'Feature Flags',
    path: '/platform/feature-flags',
    section: 'Platform',
    purpose: 'Toggle features on/off per organization or globally.',
    keywords: ['feature flags', 'feature toggle', 'flags'],
    roles: ['platform_owner', 'platform_admin'],
  },
  {
    id: 'platform-analytics',
    label: 'Platform Analytics',
    path: '/platform/analytics',
    section: 'Platform',
    purpose: 'Platform-wide analytics and usage metrics.',
    keywords: ['platform analytics', 'usage metrics', 'platform data'],
    roles: ['platform_owner'],
  },
  {
    id: 'platform-revenue',
    label: 'Platform Revenue',
    path: '/platform/revenue',
    section: 'Platform',
    purpose: 'Platform revenue tracking and subscription analytics.',
    keywords: ['platform revenue', 'subscriptions', 'mrr', 'arr'],
    roles: ['platform_owner', 'platform_admin'],
  },
];

// ─── Task-to-Destination Registry ───
// Maps common admin intents to verified destinations and optional workflows.

export const TASK_REGISTRY: TaskRegistryEntry[] = [
  {
    intents: ['change permissions', 'edit permissions', 'update permissions', 'manage permissions', 'set permissions', 'configure permissions'],
    destinationId: 'roles-controls-hub',
    workflow: { task: 'Change user permissions', steps: ['Open Roles & Controls Hub from System section in sidebar', 'Click the Permissions tab', 'Select the role to edit', 'Toggle permissions on or off', 'Save changes'] },
  },
  {
    intents: ['invite someone', 'invite staff', 'invite team member', 'add team member', 'add user', 'send invitation', 'invite employee'],
    destinationId: 'roles-controls-hub',
    workflow: { task: 'Invite a team member', steps: ['Open Roles & Controls Hub from System section in sidebar', 'Click the Invitations tab', 'Click Send Invitation', 'Enter email and select role', 'Send'] },
  },
  {
    intents: ['assign role', 'change role', 'update role', 'set role', 'change user role', 'promote user'],
    destinationId: 'roles-controls-hub',
    workflow: { task: 'Assign a role to a user', steps: ['Open Roles & Controls Hub from System section in sidebar', 'Click the User Roles tab', 'Find the user', 'Select the new role', 'Confirm'] },
  },
  {
    intents: ['run payroll', 'process payroll', 'view payroll', 'check payroll', 'pay staff', 'see pay'],
    destinationId: 'my-pay',
  },
  {
    intents: ['merge clients', 'merge client records', 'combine client records', 'duplicate clients'],
    destinationId: 'client-directory',
  },
  {
    intents: ['edit cancellation policy', 'change cancellation policy', 'cancellation fee', 'no-show fee', 'no show policy'],
    destinationId: 'settings',
  },
  {
    intents: ['manage pto', 'pto balance', 'time off', 'vacation request', 'approve pto', 'edit pto', 'view pto'],
    destinationId: 'pto-balances',
  },
  {
    intents: ['create announcement', 'make announcement', 'post announcement', 'send announcement', 'new announcement'],
    destinationId: 'announcements',
    workflow: { task: 'Create an announcement', steps: ['Open Announcements from the Operations Hub', 'Click Create Announcement', 'Enter title and content', 'Set priority and optional expiration', 'Publish'] },
  },
  {
    intents: ['schedule 1:1', 'schedule meeting', 'book 1:1', 'one on one meeting', 'create 1:1'],
    destinationId: 'schedule-meeting',
  },
  {
    intents: ['set up commission', 'edit commission', 'change commission', 'commission settings', 'commission structure', 'configure commission'],
    destinationId: 'settings',
  },
  {
    intents: ['manage recruiting', 'view recruiting', 'hiring pipeline', 'add candidate', 'post job', 'view candidates'],
    destinationId: 'recruiting',
  },
  {
    intents: ['view client health', 'check client health', 'at-risk clients', 'client retention', 'client churn'],
    destinationId: 'client-health',
  },
  {
    intents: ['manage campaigns', 'create campaign', 'view campaigns', 'marketing campaigns', 'run campaign'],
    destinationId: 'campaigns',
  },
  {
    intents: ['manage seo', 'improve seo', 'local seo', 'google ranking', 'seo tasks'],
    destinationId: 'seo-workshop',
  },
  {
    intents: ['manage leads', 'view leads', 'lead inbox', 'convert leads', 'lead pipeline'],
    destinationId: 'lead-management',
  },
  {
    intents: ['performance review', 'conduct review', 'write review', 'start review', 'staff review', 'evaluate staff'],
    destinationId: 'performance-reviews',
  },
  {
    intents: ['edit stylist levels', 'change stylist levels', 'configure levels', 'level structure', 'pricing tiers'],
    destinationId: 'stylist-levels',
  },
  {
    intents: ['view utilization', 'check utilization', 'staff utilization report', 'utilization rates'],
    destinationId: 'staff-utilization',
  },
  {
    intents: ['generate report', 'create report', 'export report', 'build report', 'custom report'],
    destinationId: 'report-generator',
  },
  {
    intents: ['manage day rates', 'edit day rates', 'booth rental pricing', 'day rate pricing'],
    destinationId: 'day-rate-settings',
  },
  {
    intents: ['view feedback', 'client reviews', 'client feedback', 'satisfaction scores'],
    destinationId: 'client-feedback',
  },
  {
    intents: ['re-engage clients', 'win back clients', 'lapsed clients', 'bring clients back'],
    destinationId: 'reengagement',
  },
];

/**
 * Find matching destinations for a query, filtered by user role.
 * Searches both NAV_DESTINATIONS (keywords/labels) and TASK_REGISTRY (intents).
 * Returns destinations sorted by relevance with confidence tier.
 */
export function findMatchingDestinations(query: string, userRole?: string): (NavDestination & { matchConfidence: 'high' | 'medium' | 'low' })[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(w => w.length > 2);
  const scored: { dest: NavDestination; score: number }[] = [];

  // --- Search task registry first for intent matches ---
  for (const entry of TASK_REGISTRY) {
    const dest = NAV_DESTINATIONS.find(d => d.id === entry.destinationId);
    if (!dest) continue;
    if (userRole && !dest.roles.includes(userRole)) continue;

    for (const intent of entry.intents) {
      if (q.includes(intent)) {
        // Exact intent match — highest priority
        const existing = scored.find(s => s.dest.id === dest.id);
        // If the task registry has a workflow, temporarily attach it
        const enrichedDest = entry.workflow
          ? { ...dest, workflows: [...(dest.workflows || []), entry.workflow] }
          : dest;
        if (existing) {
          existing.score = Math.max(existing.score, 15);
          if (entry.workflow) existing.dest = enrichedDest;
        } else {
          scored.push({ dest: enrichedDest, score: 15 });
        }
        break;
      }
      // Partial intent word overlap
      const intentWords = intent.split(/\s+/);
      const overlap = intentWords.filter(iw => words.some(w => w.includes(iw) || iw.includes(w))).length;
      if (overlap >= 2) {
        const existing = scored.find(s => s.dest.id === dest.id);
        const enrichedDest = entry.workflow
          ? { ...dest, workflows: [...(dest.workflows || []), entry.workflow] }
          : dest;
        if (existing) {
          existing.score = Math.max(existing.score, 8 + overlap);
          if (entry.workflow) existing.dest = enrichedDest;
        } else {
          scored.push({ dest: enrichedDest, score: 8 + overlap });
        }
      }
    }
  }

  // --- Search destinations by keywords/labels ---
  for (const dest of NAV_DESTINATIONS) {
    if (userRole && !dest.roles.includes(userRole)) continue;
    if (scored.find(s => s.dest.id === dest.id)) continue; // already matched via task registry

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
    .map(s => ({
      ...s.dest,
      matchConfidence: s.score >= 10 ? 'high' as const : s.score >= 5 ? 'medium' as const : 'low' as const,
    }));
}
