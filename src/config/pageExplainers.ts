/**
 * PAGE EXPLAINER CONTENT REGISTRY
 * 
 * Single source of truth for all page explainer content.
 * Every dashboard page must have an entry here.
 * 
 * Usage:
 *   import { PAGE_EXPLAINERS } from '@/config/pageExplainers';
 *   <PageExplainer pageId="analytics-hub" />
 */

import { PLATFORM_NAME } from '@/lib/brand';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Calendar, MessageSquare, Clipboard, Beaker, BarChart3,
  Users, Heart, Megaphone, Shield, DollarSign, Settings, TrendingUp,
  GraduationCap, Trophy, Award, ArrowLeftRight, Gift, Bell as BellIcon,
  Star, BookOpen, Briefcase, UserPlus, Target, ClipboardList, Palette,
  Building2, MapPin, Monitor, FlaskConical, FileText, ShieldCheck,
  Layers, Scale, ChartBar, Receipt, CreditCard, Camera, Cake,
  AlertTriangle, Sparkles, CalendarClock, HandHelping, Lightbulb,
  Clock, Search, Mail, Rocket, Cpu, Database, Activity,
  Lock, Flag, HelpCircle, Zap, Package, PieChart, Gauge, ListChecks,
  Newspaper, Volume2, Globe, Paintbrush, Link, CircleDot,
} from 'lucide-react';

export interface PageExplainerEntry {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export const PAGE_EXPLAINERS: Record<string, PageExplainerEntry> = {
  // ============================================================
  // MAIN NAV
  // ============================================================
  'command-center': {
    title: 'Your Daily Operating View',
    description: `Surfaces today's appointments, KPIs, alerts, and pinned analytics in one view. Start every day here — everything you need to act on is already waiting.`,
    icon: LayoutDashboard,
  },
  'schedule': {
    title: 'Booking Calendar',
    description: 'View and manage appointments across all staff and locations. Switch between day, week, month, and agenda views. Click to book, drag to reschedule.',
    icon: Calendar,
  },
  'team-chat': {
    title: 'Zura Connect',
    description: `Team & client communications hub. Create channels by topic or location, share updates, message clients, and keep every conversation organized — all inside ${PLATFORM_NAME}.`,
    icon: MessageSquare,
  },

  // ============================================================
  // MY TOOLS
  // ============================================================
  'today-prep': {
    title: 'Daily Prep Sheet',
    description: `Your personal prep sheet for the day. Review upcoming clients, their history, preferences, and any notes — so you walk into every appointment prepared.`,
    icon: Clipboard,
  },
  'my-mixing': {
    title: 'My Mixing Station',
    description: `Track your color formulas and mixing sessions in real time. ${PLATFORM_NAME} logs product usage, flags variances, and builds your formula history automatically.`,
    icon: Beaker,
  },
  'my-stats': {
    title: 'Personal Performance',
    description: `Track your key metrics — revenue, retention, rebooking, retail, and utilization. See how you're trending and where to focus for growth.`,
    icon: BarChart3,
  },
  'my-pay': {
    title: 'Pay & Earnings',
    description: 'View your earnings breakdown, commission calculations, tips, and pay history. Everything is transparent so you always know where you stand.',
    icon: DollarSign,
  },
  'training': {
    title: 'Training & Education',
    description: `Access your assigned training modules, track completion progress, and earn certifications. ${PLATFORM_NAME} connects training to your level progression.`,
    icon: GraduationCap,
  },
  'program': {
    title: 'Growth Program',
    description: `Your structured career path. See your current level, what's required to advance, and track progress across all promotion criteria in real time.`,
    icon: Target,
  },
  'leaderboard': {
    title: 'Team Leaderboard',
    description: 'See how the team is performing this week across key metrics. Friendly competition drives growth — celebrate wins and identify coaching moments.',
    icon: Trophy,
  },
  'shift-swaps': {
    title: 'Shift Swap Marketplace',
    description: 'Request shift swaps, pick up open shifts, or offer yours to teammates. All swaps require manager approval to maintain scheduling integrity.',
    icon: ArrowLeftRight,
  },
  'rewards': {
    title: 'Rewards Shop',
    description: 'Redeem your earned points for rewards. Points are earned through performance milestones, training completion, and team contributions.',
    icon: Gift,
  },
  'ring-the-bell': {
    title: 'Ring the Bell',
    description: 'Celebrate wins with your team. Ring the bell for big achievements — retail milestones, rebooking streaks, personal bests, and more.',
    icon: BellIcon,
  },
  'my-graduation': {
    title: 'My Level Progress',
    description: `Track your performance against your current level's requirements. See what it takes to advance to the next level, monitor your retention standing, and view your promotion history.`,
    icon: GraduationCap,
  },
  'weekly-wins': {
    title: 'Weekly Wins',
    description: 'Review the team\'s highlights from the past week. Celebrate top performers, notable achievements, and momentum builders.',
    icon: Star,
  },
  'my-handbooks': {
    title: 'Handbooks & Policies',
    description: 'Access your organization\'s handbooks, policy documents, and standard operating procedures. Always have the latest version at your fingertips.',
    icon: BookOpen,
  },
  'my-profile': {
    title: 'My Profile',
    description: 'Manage your personal information, profile photo, contact details, and notification preferences.',
    icon: Users,
  },
  'waitlist': {
    title: 'Cancellation Waitlist',
    description: 'Manage clients waiting for earlier appointments. When a slot opens, offer it to waitlisted clients automatically based on priority and preferences.',
    icon: Clock,
  },
  'all-notifications': {
    title: 'Notification Center',
    description: 'View all your notifications in one place. Filter by type, mark as read, and stay on top of what needs your attention.',
    icon: BellIcon,
  },
  'notification-preferences': {
    title: 'Notification Settings',
    description: 'Control which notifications you receive and how — in-app, email, or push. Customize by category to reduce noise and stay focused.',
    icon: BellIcon,
  },

  // ============================================================
  // ADMIN HUBS
  // ============================================================
  'analytics-hub': {
    title: 'Performance Intelligence',
    description: 'Drill into revenue, retention, utilization, and growth metrics across configurable time periods and locations. Pin important cards to your Command Center.',
    icon: BarChart3,
  },
  'team-hub': {
    title: 'Team Operations',
    description: 'Central command for team management. Access onboarding, scheduling, performance reviews, training, and team health — all in one place.',
    icon: Users,
  },
  'client-hub': {
    title: 'Client Intelligence',
    description: 'Client management, health tracking, and engagement tools. Monitor retention risk, manage client records, and run re-engagement campaigns.',
    icon: Heart,
  },
  'growth-hub': {
    title: 'Growth & Marketing',
    description: `Marketing campaigns, lead management, testimonials, and SEO tools. ${PLATFORM_NAME} validates marketing against operational capacity before amplifying demand.`,
    icon: Megaphone,
  },
  'access-hub': {
    title: 'Roles & Controls Hub',
    description: 'Control what each role can see and do. Manage invitations, module visibility, team PINs, and feature access across your organization.',
    icon: Shield,
  },
  'management-hub': {
    title: 'Management Center',
    description: 'Operational tools for day-to-day management. Daily huddles, incident reports, accountability tracking, and team oversight.',
    icon: Briefcase,
  },
  'payroll': {
    title: 'Payroll & Commissions',
    description: 'Run payroll, review commission calculations, manage pay schedules, and track payroll history. Commission models must be defined before payouts.',
    icon: DollarSign,
  },
  'settings': {
    title: 'Organization Settings',
    description: 'Configure your organization\'s core settings — business info, locations, integrations, branding, and operational preferences.',
    icon: Settings,
  },
  'reports-hub': {
    title: 'Reports Center',
    description: 'Access and generate detailed reports across all operational areas. Export data, schedule recurring reports, and share with stakeholders.',
    icon: FileText,
  },

  // ============================================================
  // ADMIN SUB-PAGES
  // ============================================================
  'sales-dashboard': {
    title: 'Sales Performance',
    description: 'Real-time sales tracking across locations. Monitor daily revenue, product sales, service revenue, and year-over-year comparisons.',
    icon: TrendingUp,
  },
  'onboarding-tracker': {
    title: 'Onboarding Hub',
    description: 'Monitor team onboarding progress, invitations, and checklist completion. Ensure every new hire completes required steps before their first client.',
    icon: UserPlus,
  },
  'recruiting': {
    title: 'Recruiting Pipeline',
    description: 'Track candidates through your hiring pipeline. Manage applications, schedule interviews, and convert top talent into team members.',
    icon: Search,
  },
  'performance-reviews': {
    title: 'Performance Reviews',
    description: 'Conduct structured performance reviews with standardized criteria. Track review history and connect outcomes to growth programs.',
    icon: ClipboardList,
  },
  'stylist-levels': {
    title: 'Level Architecture',
    description: 'Define and manage your stylist level system. Set promotion criteria, pricing tiers, and commission rates for each level.',
    icon: Layers,
  },
  'team-overview': {
    title: 'Team Directory',
    description: 'View your complete team roster with roles, locations, and key metrics. Quick access to profiles, schedules, and performance data.',
    icon: Users,
  },
  'team-directory': {
    title: 'Staff Directory',
    description: 'Browse and search your full team directory. View profiles, contact info, roles, and current status for every team member.',
    icon: Users,
  },
  'client-directory': {
    title: 'Client Directory',
    description: 'Search and manage your client database. View visit history, preferences, spending patterns, and engagement status.',
    icon: Users,
  },
  'inventory': {
    title: 'Inventory Management',
    description: 'Track product inventory levels, set reorder alerts, and manage stock across locations. Monitor usage patterns and prevent stockouts.',
    icon: Package,
  },
  'appointments-hub': {
    title: 'Appointments & Transactions',
    description: 'Unified hub for appointment records and daily transaction management. View bookings across staff and locations, manage till balance, process refunds, issue credits, and handle gift cards.',
    icon: CalendarClock,
  },
  'chair-assignments': {
    title: 'Chair Assignments',
    description: 'Assign stylists to chairs weekly. Randomize or carry over from previous weeks to keep the floor organized.',
    icon: MapPin,
  },
  'account-management': {
    title: 'Platform Billing',
    description: `Your ${PLATFORM_NAME} subscription is billed at the organization level — one invoice covers all locations. Costs are itemized per location so your accountant can allocate to each LLC. This is separate from Point Of Sale, which handles customer payment processing and payouts per-location.`,
    icon: CreditCard,
  },
  'zura-pay-config': {
    title: 'Payment Processing & Payouts',
    description: `Point Of Sale handles customer-facing payment processing — terminals, card-on-file, and deposits. Each location can connect its own bank account for separate LLC payouts and liability isolation. This is independent of your platform subscription on the Account & Billing page.`,
    icon: CreditCard,
  },
  'business-identity': {
    title: 'Legal Entity Defaults',
    description: `The EIN and Legal Name here serve as your organization default. Individual locations can override these values in Location Settings for multi-LLC setups. Stripe Connect collects its own legal and banking data separately during onboarding.`,
    icon: Building2,
  },
  'announcements': {
    title: 'Team Announcements',
    description: 'Create and manage announcements for your team. Pin important updates, set expiration dates, and track read status.',
    icon: Megaphone,
  },
  'announcement-bar': {
    title: 'Announcement Bar Manager',
    description: 'Configure the persistent announcement bar that appears across the platform. Use for urgent updates, promotions, or important notices.',
    icon: Volume2,
  },
  'campaigns': {
    title: 'Action Campaigns',
    description: 'Create and manage structured action campaigns with tasks, deadlines, and team assignments. Track progress toward operational goals.',
    icon: Rocket,
  },
  'challenges': {
    title: 'Team Challenges',
    description: 'Run team challenges with leaderboards and rewards. Drive engagement around specific goals like retail sales, rebooking, or new client acquisition.',
    icon: Trophy,
  },
  'lead-management': {
    title: 'Lead Management',
    description: 'Track and nurture incoming leads. Manage inquiries, assign follow-ups, and convert prospects into booked clients.',
    icon: UserPlus,
  },
  'testimonials': {
    title: 'Testimonials Manager',
    description: 'Collect, curate, and publish client testimonials. Manage review requests and showcase your best feedback.',
    icon: Star,
  },
  'seo-workshop': {
    title: 'SEO Workshop',
    description: 'Optimize your online presence with guided SEO tools. Improve search rankings, manage local listings, and track visibility.',
    icon: Globe,
  },
  'website-hub': {
    title: 'Website Management',
    description: 'Manage your salon\'s web presence. Update content, manage stylist profiles, and control what clients see online.',
    icon: Globe,
  },
  'homepage-stylists': {
    title: 'Homepage Stylist Profiles',
    description: 'Manage which stylists appear on your public website and how they\'re presented. Control ordering, bios, and visibility.',
    icon: Users,
  },
  'document-tracker': {
    title: 'Document Tracker',
    description: 'Track required documents for compliance — licenses, certifications, insurance, and contracts. Get alerts before expiration.',
    icon: FileText,
  },
  'handbooks': {
    title: 'Handbook Manager',
    description: 'Create and distribute team handbooks. Track acknowledgments and ensure everyone has read the latest policies.',
    icon: BookOpen,
  },
  'policies': {
    title: 'Policy OS',
    description: 'Adopt and configure cancellation, no-show, redo, and house policies. Versioned, conflict-aware, and surfaced across booking, checkout, and the public Policy Center.',
    icon: ShieldCheck,
  },
  'pto-manager': {
    title: 'PTO & Time Off',
    description: 'Manage paid time off requests, vacation balances, and time-off policies. Approve or deny requests with calendar visibility.',
    icon: CalendarClock,
  },
  'schedule-requests': {
    title: 'Schedule Change Requests',
    description: 'Review and approve schedule change requests from team members. Maintain scheduling integrity while accommodating needs.',
    icon: CalendarClock,
  },
  'shift-swap-approvals': {
    title: 'Shift Swap Approvals',
    description: 'Review and approve shift swap requests. Ensure adequate coverage before approving trades between team members.',
    icon: ArrowLeftRight,
  },
  'assistant-requests': {
    title: 'Assistant Requests',
    description: 'Manage assistant assignment requests from stylists. Track availability, response times, and assignment distribution.',
    icon: HandHelping,
  },
  'assistant-schedule': {
    title: 'Assistant Schedule',
    description: 'View and manage assistant time blocks and assignments. Ensure assistants are allocated efficiently across the floor.',
    icon: Calendar,
  },
  'daily-huddle': {
    title: 'Daily Huddle',
    description: 'Quick daily team standup tool. Review yesterday\'s highlights, today\'s focus, and any blockers — structured for 5-minute meetings.',
    icon: Users,
  },
  'incident-reports': {
    title: 'Incidents & Accountability',
    description: 'Document workplace incidents and track staff accountability measures. Maintain formal records for compliance, insurance, process improvement, and progressive documentation.',
    icon: AlertTriangle,
  },
  'decision-history': {
    title: 'Decision History',
    description: 'Audit trail of key organizational decisions. Track who decided what, when, and why — for accountability and institutional memory.',
    icon: ClipboardList,
  },
  'points-config': {
    title: 'Points Configuration',
    description: 'Configure your rewards point system. Set earning rules, point values, and redemption options for team incentives.',
    icon: Award,
  },
  'team-birthdays': {
    title: 'Team Birthdays',
    description: 'Never miss a team birthday. View upcoming celebrations and plan recognition for your team members.',
    icon: Cake,
  },
  'business-card-requests': {
    title: 'Business Card Requests',
    description: 'Process and manage business card requests from team members. Track orders, approve designs, and manage fulfillment.',
    icon: CreditCard,
  },
  'headshot-requests': {
    title: 'Headshot Requests',
    description: 'Manage professional headshot requests for team members. Schedule sessions, track completion, and distribute final photos.',
    icon: Camera,
  },
  'locations-manager': {
    title: 'Locations',
    description: 'Manage your business locations — addresses, hours, holiday schedules, and location-specific settings.',
    icon: MapPin,
  },
  'services-manager': {
    title: 'Services & Menu',
    description: 'Manage your service menu — categories, pricing, duration, and descriptions. Keep your offerings structured and up to date.',
    icon: ListChecks,
  },
  'data-import': {
    title: 'Data Import',
    description: 'Import data from external systems. Upload CSV files for clients, appointments, products, and other business data.',
    icon: Database,
  },
  'phorest-settings': {
    title: 'POS Integration',
    description: 'Configure your point-of-sale integration. Manage sync settings, field mappings, and data flow between systems.',
    icon: Cpu,
  },
  'feature-flags': {
    title: 'Feature Flags',
    description: `Control which features are enabled for your organization. Toggle experimental features and customize your ${PLATFORM_NAME} experience.`,
    icon: Flag,
  },
  'features-center': {
    title: 'Features Center',
    description: `Explore all available ${PLATFORM_NAME} features. See what's enabled, what's available, and request access to new capabilities.`,
    icon: Sparkles,
  },
  'feedback-hub': {
    title: 'Feedback Hub',
    description: `Share feedback, report issues, and request features. Help shape ${PLATFORM_NAME} by telling us what matters most to your business.`,
    icon: MessageSquare,
  },
  'executive-brief': {
    title: 'Weekly Intelligence Brief',
    description: `Your weekly executive summary. ${PLATFORM_NAME} analyzes the past week and surfaces the highest-impact insights and recommended actions.`,
    icon: Lightbulb,
  },
  'kpi-builder': {
    title: 'KPI Architecture',
    description: 'Define and configure your key performance indicators. Set targets, thresholds, and tracking rules that power all intelligence surfaces.',
    icon: Gauge,
  },
  'price-recommendations': {
    title: 'Price Recommendations',
    description: 'AI-powered pricing suggestions based on market data, utilization, and demand patterns. Review and apply recommendations by level.',
    icon: DollarSign,
  },
  'merge-clients': {
    title: 'Merge Clients',
    description: 'Identify and merge duplicate client records. Consolidate visit history, preferences, and contact info into a single profile.',
    icon: Users,
  },
  'reengagement-hub': {
    title: 'Re-engagement Hub',
    description: 'Identify lapsed clients and run targeted re-engagement campaigns. Recover lost revenue with personalized outreach.',
    icon: Heart,
  },
  'client-engine-tracker': {
    title: 'Client Engine',
    description: 'Monitor client lifecycle metrics — acquisition, activation, retention, and churn. Understand your client pipeline health.',
    icon: Activity,
  },
  'marketing-analytics': {
    title: 'Marketing Analytics',
    description: 'Measure campaign performance, track ROI, and analyze marketing spend effectiveness across channels.',
    icon: PieChart,
  },
  'program-editor': {
    title: 'Program Editor',
    description: 'Design and configure your growth programs. Set milestones, requirements, and rewards for each career progression path.',
    icon: Target,
  },
  'program-analytics': {
    title: 'Program Analytics',
    description: 'Track participation and outcomes across your growth programs. See who\'s progressing, who\'s stuck, and where to intervene.',
    icon: BarChart3,
  },
  'training-hub': {
    title: 'Training Administration',
    description: 'Manage training content, assign modules, and track team completion. Connect training to certifications and level progression.',
    icon: GraduationCap,
  },
  'graduation-tracker': {
    title: 'Graduation Tracker',
    description: 'Monitor team-wide level progression, retention standing, and coaching needs. Identify who is ready for promotion, who is at risk of falling below standard, and manage assistant graduation checklists — all in one place.',
    icon: GraduationCap,
  },
  'booth-renters': {
    title: 'Booth Renter Management',
    description: 'Manage booth renters — contracts, rent collection, onboarding, and compliance. Keep independent contractors organized alongside your team.',
    icon: Building2,
  },
  'renter-portal': {
    title: 'Renter Portal',
    description: 'Your booth rental dashboard. View rent status, payment history, and manage your independent business within the salon.',
    icon: Building2,
  },
  'renter-commissions': {
    title: 'Renter Commissions',
    description: 'View your commission earnings and payment breakdown as a booth renter.',
    icon: DollarSign,
  },
  'day-rate-settings': {
    title: 'Day Rate Configuration',
    description: 'Configure day rate pricing and availability. Set rates by day of week, manage special pricing, and control booking rules.',
    icon: DollarSign,
  },
  'day-rate-calendar': {
    title: 'Day Rate Calendar',
    description: 'Visual calendar for day rate availability and bookings. See occupancy at a glance and manage reservations.',
    icon: Calendar,
  },
  'register': {
    title: 'Register',
    description: 'Point-of-sale register for walk-in sales, retail purchases, and quick checkouts outside of appointment flow.',
    icon: Receipt,
  },
  'changelog': {
    title: 'Changelog',
    description: `See what's new in ${PLATFORM_NAME}. Browse recent updates, new features, improvements, and bug fixes.`,
    icon: Newspaper,
  },
  'help-center': {
    title: 'Help & Support',
    description: `Find answers, browse guides, and get support. ${PLATFORM_NAME} help center has everything you need to get the most from the platform.`,
    icon: HelpCircle,
  },
  'metrics-glossary': {
    title: 'Metrics Glossary',
    description: 'Reference guide for every metric and KPI used across the platform. Understand exactly what each number means and how it\'s calculated.',
    icon: BookOpen,
  },
  'loyalty-program': {
    title: 'Loyalty Program',
    description: 'Configure your client loyalty program. Set point earning rules, reward tiers, and redemption options to drive repeat visits.',
    icon: Heart,
  },
  'operational-analytics': {
    title: 'Operational Analytics',
    description: 'Deep-dive into operational efficiency — utilization rates, gap analysis, scheduling patterns, and capacity optimization.',
    icon: BarChart3,
  },
  'pause-requests': {
    title: 'Pause Requests',
    description: 'Manage client subscription pause requests. Review, approve, and track temporary service holds.',
    icon: Clock,
  },
  'zura-config': {
    title: 'AI Configuration',
    description: `Configure ${PLATFORM_NAME}'s AI behavior, coaching personality, and intelligence preferences for your organization.`,
    icon: Sparkles,
  },

  // ============================================================
  // COLOR BAR SETTINGS (migrated from inline)
  // ============================================================
  'color-bar-settings': {
    title: 'Color Bar Configuration',
    description: `Configure your color bar operations — stations, hardware, service tracking, compliance rules, and inventory management. This is the control center for ${PLATFORM_NAME}'s chemical tracking system.`,
    icon: Palette,
  },
  'color-bar-stations': {
    title: 'Stations & Hardware',
    description: `Register your physical mixing stations and optionally pair Bluetooth scales. Each station is tied to a location so ${PLATFORM_NAME} knows where mixing happens.`,
    icon: Monitor,
  },
  'color-bar-services': {
    title: 'Service Tracking',
    description: `Link your services to the products they consume. This tells ${PLATFORM_NAME} which products to expect and powers allowance billing, compliance tracking, and Smart Mix Assist.`,
    icon: CircleDot,
  },
  'color-bar-recipes': {
    title: 'Formula Baselines',
    description: `Define standard product quantities per service. ${PLATFORM_NAME} uses these baselines to detect over- or under-dispensing and calculate waste metrics.`,
    icon: FlaskConical,
  },
  'color-bar-compliance': {
    title: 'Compliance Reports',
    description: 'Track staff compliance, product waste, and accountability across color/chemical appointments.',
    icon: ShieldCheck,
  },
  'color-bar-allowances': {
    title: 'Allowances & Billing',
    description: `Configure product allowance policies for booth renters. Define included quantities, overage rates, and billing rules that ${PLATFORM_NAME} enforces automatically.`,
    icon: Scale,
  },
  'color-bar-inventory': {
    title: 'Inventory & Replenishment',
    description: `Set reorder points and monitor product levels. ${PLATFORM_NAME} tracks real-time depletion from mixing sessions and alerts you before products run out.`,
    icon: Package,
  },
  'color-bar-multilocation': {
    title: 'Multi-Location Settings',
    description: 'View and manage setting differences between locations. Push org defaults to all locations at once, copy between locations, or compare side-by-side.',
    icon: Building2,
  },
  'color-bar-subscription': {
    title: 'Color Bar Subscription',
    description: `Manage your Color Bar module subscription. View plan details, usage, and billing for ${PLATFORM_NAME}'s chemical tracking features.`,
    icon: CreditCard,
  },
  'color-bar-setup-overview': {
    title: 'Setup Overview',
    description: `This dashboard shows your Color Bar configuration progress. Complete each area to unlock full tracking, billing, and compliance features. Use the Setup Wizard for a guided walkthrough, or configure each section individually.`,
    icon: LayoutDashboard,
  },
  'color-bar-permissions': {
    title: 'Color Bar Permissions',
    description: 'Decide who can do what in Color Bar — from mixing bowls to viewing costs to overriding charges. Each column is a role, each row is a capability.',
    icon: ShieldCheck,
  },
  'color-bar-alerts': {
    title: 'Alerts & Exceptions',
    description: 'Set up automatic alerts for operational issues — like a stylist skipping the reweigh step, using 50% more product than expected, or running low on stock.',
    icon: AlertTriangle,
  },
  'color-bar-formula': {
    title: 'Formula Assistance',
    description: 'Smart Mix Assist suggests formulas based on client history and formula baselines. Configure the suggestion priority, auto-populate behavior, and the disclaimer shown to staff.',
    icon: Sparkles,
  },
  'color-bar-products': {
    title: 'Products & Supplies',
    description: "Choose which products stylists use at the mixing station. Toggle tracking on, set costs, and pick how each product is measured (weighed, pumped, etc). Do this first — services can't be tracked without products.",
    icon: Package,
  },

  // ============================================================
  'platform-overview': {
    title: 'Platform Command Center',
    description: 'Monitor all accounts, recent activity, and system health from a single view. Your operational dashboard for the entire platform.',
    icon: LayoutDashboard,
  },
  'platform-accounts': {
    title: 'Account Management',
    description: 'View and manage all organization accounts. Monitor onboarding status, health scores, subscription tiers, and account activity.',
    icon: Building2,
  },
  'platform-account-detail': {
    title: 'Account Detail',
    description: 'Deep-dive into a specific account — configuration, health metrics, activity log, and operational status.',
    icon: Building2,
  },
  'platform-health-scores': {
    title: 'Health Scores',
    description: 'Monitor account health across the platform. Identify at-risk accounts, track adoption metrics, and prioritize outreach.',
    icon: Activity,
  },
  'platform-benchmarks': {
    title: 'Industry Benchmarks',
    description: 'Cross-account performance benchmarks. Compare KPIs across the platform to identify top performers and establish standards.',
    icon: BarChart3,
  },
  'platform-onboarding': {
    title: 'Onboarding Pipeline',
    description: 'Track new accounts through the onboarding process. Monitor setup completion, blockers, and time-to-value for each account.',
    icon: Rocket,
  },
  'platform-jobs': {
    title: 'Background Jobs',
    description: 'Monitor system jobs — data syncs, imports, scheduled tasks, and background processing. Track status and troubleshoot failures.',
    icon: Cpu,
  },
  'platform-coach': {
    title: 'Coach Dashboard',
    description: 'Tools for platform coaches. Manage account assignments, track coaching sessions, and monitor client success metrics.',
    icon: HandHelping,
  },
  'platform-audit-log': {
    title: 'Activity Log',
    description: 'Complete audit trail of platform-level actions. Track admin operations, account changes, and system events for compliance.',
    icon: ClipboardList,
  },
  'platform-system-health': {
    title: 'System Health',
    description: 'Monitor platform infrastructure — API response times, error rates, queue depths, and service status across all subsystems.',
    icon: Activity,
  },
  'platform-payments-health': {
    title: 'Point Of Sale Health',
    description: 'Monitor payment processing health. Track failed charges, subscription status, and billing issues across all accounts.',
    icon: CreditCard,
  },
  'platform-notifications': {
    title: 'Notification Management',
    description: 'Manage platform-wide notifications. Send targeted announcements, configure notification templates, and monitor delivery.',
    icon: BellIcon,
  },
  'platform-analytics': {
    title: 'Platform Analytics',
    description: 'Aggregate analytics across all accounts. Track platform growth, feature adoption, revenue trends, and operational metrics.',
    icon: PieChart,
  },
  'platform-knowledge-base': {
    title: 'Knowledge Base',
    description: 'Manage help articles, guides, and documentation. Create and organize content that powers the in-app help system.',
    icon: BookOpen,
  },
  'platform-revenue': {
    title: 'Platform Revenue',
    description: 'Track platform revenue — subscriptions, add-ons, and billing metrics. Monitor MRR, churn, and expansion revenue.',
    icon: DollarSign,
  },
  'platform-billing-guide': {
    title: 'Billing Guide',
    description: 'Reference guide for platform billing — plan tiers, pricing rules, proration logic, and billing cycle management.',
    icon: FileText,
  },
  'platform-color-bar': {
    title: 'Color Bar Administration',
    description: 'Platform-level Color Bar management. Monitor adoption, configure defaults, and manage cross-account chemical tracking settings.',
    icon: Palette,
  },
  'platform-permissions': {
    title: 'Permission Architecture',
    description: 'Define and manage platform-level permission structures. Configure role templates and access control patterns.',
    icon: Lock,
  },
  'platform-feature-flags': {
    title: 'Feature Flags',
    description: 'Control feature rollout across the platform. Toggle features by account, tier, or percentage for staged releases.',
    icon: Flag,
  },
  'platform-settings': {
    title: 'Platform Settings',
    description: 'Global platform configuration — default settings, system parameters, and infrastructure-level controls.',
    icon: Settings,
  },
  'platform-import': {
    title: 'Platform Import',
    description: 'Manage bulk data imports across accounts. Monitor import jobs, handle errors, and validate data quality.',
    icon: Database,
  },
  'platform-demo': {
    title: 'Demo Features',
    description: 'Preview and test upcoming features in demo mode. Explore new capabilities before they roll out to accounts.',
    icon: Sparkles,
  },
  'platform-integration-detail': {
    title: 'Integration Detail',
    description: 'View detailed configuration and status for a specific platform integration. Monitor sync health and troubleshoot issues.',
    icon: Link,
  },

  // ============================================================
  // MEETINGS
  // ============================================================
  'schedule-meeting': {
    title: 'Schedule a Meeting',
    description: 'Book team meetings, one-on-ones, and huddles. Set agendas, invite attendees, and choose between in-person or virtual.',
    icon: Calendar,
  },
  'meeting-details': {
    title: 'Meeting Details',
    description: 'View meeting agenda, notes, action items, and attendee list. Record outcomes and track follow-up tasks.',
    icon: ClipboardList,
  },
  'team-calendar': {
    title: 'Team Calendar',
    description: 'Shared calendar view for team meetings, events, and availability. Coordinate schedules across the organization.',
    icon: Calendar,
  },
};
