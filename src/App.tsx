import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "./components/ScrollToTop";

import { AuthProvider } from "./contexts/AuthContext";
import { ViewAsProvider } from "./contexts/ViewAsContext";
import { HideNumbersProvider } from "./contexts/HideNumbersContext";
import { DashboardThemeProvider } from "./contexts/DashboardThemeContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { SoundSettingsProvider } from "./contexts/SoundSettingsContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { I18nLocaleSync } from "./components/I18nLocaleSync";
import { DevContextBridge } from "./dev/DevContextBridge";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CommandMenu } from "./components/command/CommandMenu";
import { OrgDashboardRoute, LegacyDashboardRedirect } from "./components/OrgDashboardRoute";

// Platform pages
import PlatformLanding from "./pages/PlatformLanding";
import UnifiedLogin from "./pages/UnifiedLogin";
import NotFound from "./pages/NotFound";

// Organization public pages (under /org/:orgSlug)
import { OrgPublicRoute } from "./components/org/OrgPublicRoute";

// Dashboard pages



// Team Challenges & Shift Swaps

// HR Tools Suite

// Engagement Features: Points, Huddles, Training Enhancements

// V1 Zura Intelligence

// Team Chat

// Client Engagement Tools

// Renter Portal pages

// Platform Admin pages

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
const Index = lazy(() => import("./pages/Index"));
const Services = lazy(() => import("./pages/Services"));
const About = lazy(() => import("./pages/About"));
const Booking = lazy(() => import("./pages/Booking"));
const Stylists = lazy(() => import("./pages/Stylists"));
const Extensions = lazy(() => import("./pages/Extensions"));
const Policies = lazy(() => import("./pages/Policies"));
const Shop = lazy(() => import("./pages/Shop"));
const DynamicPage = lazy(() => import("./pages/DynamicPage"));
const Program = lazy(() => import("./pages/dashboard/Program"));
const RingTheBell = lazy(() => import("./pages/dashboard/RingTheBell"));
const Leaderboard = lazy(() => import("./pages/dashboard/Leaderboard"));
const Training = lazy(() => import("./pages/dashboard/Training"));
const Progress = lazy(() => import("./pages/dashboard/Progress"));
const Stats = lazy(() => import("./pages/dashboard/Stats"));
const WeeklyWins = lazy(() => import("./pages/dashboard/WeeklyWins"));
const TeamOverview = lazy(() => import("./pages/dashboard/admin/TeamOverview"));
const Handbooks = lazy(() => import("./pages/dashboard/admin/Handbooks"));
const AdminSettings = lazy(() => import("./pages/dashboard/admin/Settings"));
const AdminAnnouncements = lazy(() => import("./pages/dashboard/admin/Announcements"));
const HomepageStylists = lazy(() => import("./pages/dashboard/admin/HomepageStylists"));
const AccountManagement = lazy(() => import("./pages/dashboard/admin/AccountManagement"));
const TestimonialsManager = lazy(() => import("./pages/dashboard/admin/TestimonialsManager"));
const ServicesManager = lazy(() => import("./pages/dashboard/admin/ServicesManager"));
const AnnouncementBarManager = lazy(() => import("./pages/dashboard/admin/AnnouncementBarManager"));
const StylistLevels = lazy(() => import("./pages/dashboard/admin/StylistLevels"));
const LocationsManager = lazy(() => import("./pages/dashboard/admin/LocationsManager"));
const WebsiteSectionsHub = lazy(() => import("./pages/dashboard/admin/WebsiteSectionsHub"));
const TeamBirthdays = lazy(() => import("./pages/dashboard/admin/TeamBirthdays"));
const StaffStrikes = lazy(() => import("./pages/dashboard/admin/StaffStrikes"));
const BusinessCardRequests = lazy(() => import("./pages/dashboard/admin/BusinessCardRequests"));
const HeadshotRequests = lazy(() => import("./pages/dashboard/admin/HeadshotRequests"));
const MyHandbooks = lazy(() => import("./pages/dashboard/MyHandbooks"));
const Onboarding = lazy(() => import("./pages/dashboard/Onboarding"));
const AssistantSchedule = lazy(() => import("./pages/dashboard/AssistantSchedule"));
const ScheduleMeeting = lazy(() => import("./pages/dashboard/ScheduleMeeting"));
const ScheduleNewMeeting = lazy(() => import("./pages/dashboard/meetings/ScheduleNewMeeting"));
const MyMeetings = lazy(() => import("./pages/dashboard/meetings/MyMeetings"));
const CoachRequests = lazy(() => import("./pages/dashboard/meetings/CoachRequests"));
const Commitments = lazy(() => import("./pages/dashboard/meetings/Commitments"));
const MeetingInbox = lazy(() => import("./pages/dashboard/meetings/MeetingInbox"));
const MeetingDetails = lazy(() => import("./pages/dashboard/MeetingDetails"));
const MyProfile = lazy(() => import("./pages/dashboard/MyProfile"));
const ViewProfile = lazy(() => import("./pages/dashboard/ViewProfile"));
const TeamDirectory = lazy(() => import("./pages/dashboard/TeamDirectory"));
const NotificationPreferences = lazy(() => import("./pages/dashboard/NotificationPreferences"));
const OnboardingTracker = lazy(() => import("./pages/dashboard/admin/OnboardingTracker"));
const ClientEngineTracker = lazy(() => import("./pages/dashboard/admin/ClientEngineTracker"));
const AssistantRequestsOverview = lazy(() => import("./pages/dashboard/admin/AssistantRequestsOverview"));
const ScheduleRequests = lazy(() => import("./pages/dashboard/admin/ScheduleRequests"));
const DashboardBuild = lazy(() => import("./pages/dashboard/admin/DashboardBuild"));
const RecruitingPipeline = lazy(() => import("./pages/dashboard/admin/RecruitingPipeline"));
const GraduationTracker = lazy(() => import("./pages/dashboard/admin/GraduationTracker"));
const MyGraduation = lazy(() => import("./pages/dashboard/MyGraduation"));
const DesignSystem = lazy(() => import("./pages/dashboard/DesignSystem"));
const ProgramEditor = lazy(() => import("./pages/dashboard/admin/ProgramEditor"));
const PhorestSettings = lazy(() => import("./pages/dashboard/admin/PhorestSettings"));
const AnalyticsHub = lazy(() => import("./pages/dashboard/admin/AnalyticsHub"));
const ManagementHub = lazy(() => import("./pages/dashboard/admin/ManagementHub"));
const TrainingHub = lazy(() => import("./pages/dashboard/admin/TrainingHub"));
const TeamHub = lazy(() => import("./pages/dashboard/admin/TeamHub"));
const ClientHub = lazy(() => import("./pages/dashboard/admin/ClientHub"));
const GrowthHub = lazy(() => import("./pages/dashboard/admin/GrowthHub"));
const WebsiteHub = lazy(() => import("./pages/dashboard/admin/WebsiteHub"));
const LeadManagement = lazy(() => import("./pages/dashboard/admin/LeadManagement"));
const AdminFeatureFlags = lazy(() => import("./pages/dashboard/admin/FeatureFlags"));
const FeaturesCenter = lazy(() => import("./pages/dashboard/admin/FeaturesCenter"));
const AccessHub = lazy(() => import("./pages/dashboard/admin/AccessHub"));
const PlatformFeatureFlags = lazy(() => import("./pages/dashboard/platform/FeatureFlags"));
const ClientDirectory = lazy(() => import("./pages/dashboard/ClientDirectory"));
const Schedule = lazy(() => import("./pages/dashboard/Schedule"));
const AllNotifications = lazy(() => import("./pages/dashboard/AllNotifications"));
const Changelog = lazy(() => import("./pages/dashboard/Changelog"));
const StylistMixingDashboard = lazy(() => import("./pages/dashboard/StylistMixingDashboard"));
const MetricsGlossary = lazy(() => import("./pages/dashboard/MetricsGlossary"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const DayRateBooking = lazy(() => import("./pages/DayRateBooking"));
const ProductDemo = lazy(() => import("./pages/ProductDemo"));
const Kiosk = lazy(() => import("./pages/Kiosk"));
const Dock = lazy(() => import("./pages/Dock"));
const DayRateSettings = lazy(() => import("./pages/dashboard/admin/DayRateSettings"));
const DayRateCalendar = lazy(() => import("./pages/dashboard/admin/DayRateCalendar"));
const DataImport = lazy(() => import("./pages/dashboard/admin/DataImport"));
const ChairAssignments = lazy(() => import("./pages/dashboard/admin/ChairAssignments"));
const Payroll = lazy(() => import("./pages/dashboard/admin/Payroll"));
const PayrollCallback = lazy(() => import("./pages/dashboard/admin/PayrollCallback"));
const HelpCenter = lazy(() => import("./pages/dashboard/HelpCenter"));
const MyPay = lazy(() => import("./pages/dashboard/MyPay"));
const Transactions = lazy(() => import("./pages/dashboard/Transactions"));
const AppointmentsHub = lazy(() => import("./pages/dashboard/AppointmentsHub"));
const Inventory = lazy(() => import("./pages/dashboard/Inventory"));
const Register = lazy(() => import("./pages/dashboard/Register"));
const TodayPrep = lazy(() => import("./pages/dashboard/TodayPrep"));
const Waitlist = lazy(() => import("./pages/dashboard/Waitlist"));
const LoyaltyProgram = lazy(() => import("./pages/dashboard/settings/LoyaltyProgram"));
const BoothRenters = lazy(() => import("./pages/dashboard/admin/BoothRenters"));
const ChallengesDashboard = lazy(() => import("./pages/dashboard/admin/ChallengesDashboard"));
const ChallengeDetail = lazy(() => import("./pages/dashboard/admin/ChallengeDetail"));
const ShiftSwapMarketplace = lazy(() => import("./pages/dashboard/ShiftSwapMarketplace"));
const ShiftSwapApprovals = lazy(() => import("./pages/dashboard/admin/ShiftSwapApprovals"));
const DocumentTracker = lazy(() => import("./pages/dashboard/admin/DocumentTracker"));
const PerformanceReviews = lazy(() => import("./pages/dashboard/admin/PerformanceReviews"));
const PTOManager = lazy(() => import("./pages/dashboard/admin/PTOManager"));
const IncidentReports = lazy(() => import("./pages/dashboard/admin/IncidentReports"));
const NewHireWizard = lazy(() => import("./pages/dashboard/admin/NewHireWizard"));
const RenterOnboardWizard = lazy(() => import("./pages/dashboard/admin/RenterOnboardWizard"));
const RewardShop = lazy(() => import("./pages/dashboard/RewardShop"));
const PointsConfig = lazy(() => import("./pages/dashboard/admin/PointsConfig"));
const DailyHuddle = lazy(() => import("./pages/dashboard/admin/DailyHuddle"));
const ZuraConfigPage = lazy(() => import("./pages/dashboard/admin/ZuraConfigPage"));
const ColorBarSettings = lazy(() => import("./pages/dashboard/admin/ColorBarSettings"));
const ColorBarSubscription = lazy(() => import("./pages/dashboard/admin/ColorBarSubscription"));
const PriceRecommendations = lazy(() => import("./pages/dashboard/admin/PriceRecommendations"));
const KpiBuilderPage = lazy(() => import("./pages/dashboard/admin/KpiBuilderPage"));
const ExecutiveBriefPage = lazy(() => import("./pages/dashboard/admin/ExecutiveBriefPage"));
const DecisionHistoryPage = lazy(() => import("./pages/dashboard/admin/DecisionHistoryPage"));
const TeamChat = lazy(() => import("./pages/dashboard/TeamChat"));
const Campaigns = lazy(() => import("./pages/dashboard/Campaigns"));
const CampaignDetail = lazy(() => import("./pages/dashboard/CampaignDetail"));
const ClientFeedbackPage = lazy(() => import("./pages/ClientFeedback"));
const ClientPortalPage = lazy(() => import("./pages/ClientPortal"));
const FeedbackHub = lazy(() => import("./pages/dashboard/admin/FeedbackHub"));
const SEOWorkshopHub = lazy(() => import("./pages/dashboard/admin/SEOWorkshopHub"));
const ReengagementHub = lazy(() => import("./pages/dashboard/admin/ReengagementHub"));
const ClientHealthHub = lazy(() => import("./pages/dashboard/admin/ClientHealthHub"));
const MergeClients = lazy(() => import("./pages/dashboard/admin/MergeClients"));
const RenterPortal = lazy(() => import("./pages/dashboard/RenterPortal"));
const RenterPayRent = lazy(() => import("./pages/dashboard/RenterPayRent"));
const RenterPaymentMethods = lazy(() => import("./pages/dashboard/RenterPaymentMethods"));
const RenterCommissions = lazy(() => import("./pages/dashboard/RenterCommissions"));
const RenterTaxDocuments = lazy(() => import("./pages/dashboard/RenterTaxDocuments"));
const PlatformOverview = lazy(() => import("./pages/dashboard/platform/Overview"));
const PlatformAccounts = lazy(() => import("./pages/dashboard/platform/Accounts"));
const AccountDetail = lazy(() => import("./pages/dashboard/platform/AccountDetail"));
const PlatformImport = lazy(() => import("./pages/dashboard/platform/PlatformImport"));
const PlatformSettings = lazy(() => import("./pages/dashboard/platform/PlatformSettings"));
const PlatformRevenue = lazy(() => import("./pages/dashboard/platform/Revenue"));
const PlatformPermissions = lazy(() => import("./pages/dashboard/platform/Permissions"));
const PlatformIntegrationDetail = lazy(() => import("./pages/dashboard/platform/PlatformIntegrationDetail"));
const PlatformKnowledgeBase = lazy(() => import("./pages/dashboard/platform/KnowledgeBase"));
const PlatformOnboarding = lazy(() => import("./pages/dashboard/platform/Onboarding"));
const PlatformAnalytics = lazy(() => import("./pages/dashboard/platform/Analytics"));
const AuditLogPage = lazy(() => import("./pages/dashboard/platform/AuditLog"));
const JobsPage = lazy(() => import("./pages/dashboard/platform/Jobs"));
const SystemHealthPage = lazy(() => import("./pages/dashboard/platform/SystemHealth"));
const StripeHealthPage = lazy(() => import("./pages/dashboard/platform/StripeHealth"));
const NotificationsPage = lazy(() => import("./pages/dashboard/platform/Notifications"));
const DemoFeatures = lazy(() => import("./pages/dashboard/platform/DemoFeatures"));
const HealthScoresPage = lazy(() => import("./pages/dashboard/platform/HealthScores"));
const BenchmarksPage = lazy(() => import("./pages/dashboard/platform/Benchmarks"));
const ColorBarAdmin = lazy(() => import("./pages/dashboard/platform/ColorBarAdmin"));
const CoachDashboard = lazy(() => import("./pages/dashboard/platform/CoachDashboard"));
const BillingGuide = lazy(() => import("./pages/dashboard/platform/BillingGuide"));
const PlatformLayout = lazy(() => import("./components/platform/layout/PlatformLayout").then((module) => ({ default: module.PlatformLayout })));
const TeamCalendar = lazy(() => import("./pages/dashboard/TeamCalendar"));
const SalesDashboard = lazy(() => import("./pages/dashboard/admin/SalesDashboard"));

const queryClient = new QueryClient();

/**
 * Shared dashboard route tree.
 * Used by both /org/:orgSlug/dashboard/* (primary) and /dashboard/* (legacy redirect).
 * All paths are relative — React Router nests them under the parent.
 */
function DashboardRoutes() {
  return (
    <>
      <Route index element={<ProtectedRoute requiredPermission="view_command_center"><DashboardHome /></ProtectedRoute>} />
      <Route path="profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      <Route path="notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
      <Route path="notifications/all" element={<ProtectedRoute><AllNotifications /></ProtectedRoute>} />
      <Route path="profile/:userId" element={<ProtectedRoute requiredPermission="view_any_profile"><ViewProfile /></ProtectedRoute>} />
      <Route path="directory" element={<ProtectedRoute requiredPermission="view_team_directory"><TeamDirectory /></ProtectedRoute>} />
      <Route path="program" element={<ProtectedRoute requiredPermission="access_client_engine"><Program /></ProtectedRoute>} />
      <Route path="progress" element={<ProtectedRoute requiredPermission="access_client_engine"><Progress /></ProtectedRoute>} />
      <Route path="stats" element={<ProtectedRoute requiredPermission="view_own_stats"><Stats /></ProtectedRoute>} />
      <Route path="leaderboard" element={<ProtectedRoute requiredPermission="view_leaderboard"><Leaderboard /></ProtectedRoute>} />
      <Route path="ring-the-bell" element={<ProtectedRoute requiredPermission="ring_the_bell"><RingTheBell /></ProtectedRoute>} />
      <Route path="training" element={<ProtectedRoute requiredPermission="view_training"><Training /></ProtectedRoute>} />
      <Route path="weekly-wins" element={<ProtectedRoute requiredPermission="access_client_engine"><WeeklyWins /></ProtectedRoute>} />
      <Route path="handbooks" element={<ProtectedRoute requiredPermission="view_handbooks"><MyHandbooks /></ProtectedRoute>} />
      <Route path="onboarding" element={<ProtectedRoute requiredPermission="view_onboarding"><Onboarding /></ProtectedRoute>} />
      <Route path="assistant-schedule" element={<ProtectedRoute requiredPermission="view_assistant_schedule"><AssistantSchedule /></ProtectedRoute>} />
      <Route path="schedule-meeting" element={<ProtectedRoute requiredPermission="schedule_meetings"><ScheduleMeeting /></ProtectedRoute>} />
      <Route path="schedule-meeting/new" element={<ProtectedRoute requiredPermission="schedule_meetings"><ScheduleNewMeeting /></ProtectedRoute>} />
      <Route path="schedule-meeting/my-meetings" element={<ProtectedRoute requiredPermission="schedule_meetings"><MyMeetings /></ProtectedRoute>} />
      <Route path="schedule-meeting/requests" element={<ProtectedRoute requiredPermission="schedule_meetings"><CoachRequests /></ProtectedRoute>} />
      <Route path="schedule-meeting/commitments" element={<ProtectedRoute requiredPermission="schedule_meetings"><Commitments /></ProtectedRoute>} />
      <Route path="schedule-meeting/inbox" element={<ProtectedRoute requiredPermission="schedule_meetings"><MeetingInbox /></ProtectedRoute>} />
      <Route path="meeting/:id" element={<ProtectedRoute requiredPermission="schedule_meetings"><MeetingDetails /></ProtectedRoute>} />
      <Route path="my-graduation" element={<ProtectedRoute requiredPermission="view_my_graduation"><MyGraduation /></ProtectedRoute>} />
      <Route path="clients" element={<ProtectedRoute requiredPermission="view_clients"><ClientDirectory /></ProtectedRoute>} />
      <Route path="my-clients" element={<Navigate to="clients" replace />} />
      <Route path="my-pay" element={<ProtectedRoute requiredPermission="view_my_pay"><MyPay /></ProtectedRoute>} />
      <Route path="schedule" element={<ProtectedRoute requiredPermission="view_booking_calendar"><Schedule /></ProtectedRoute>} />
      <Route path="team-calendar" element={<ProtectedRoute requiredPermission="view_booking_calendar"><TeamCalendar /></ProtectedRoute>} />
      <Route path="today-prep" element={<ProtectedRoute requiredPermission="view_booking_calendar"><TodayPrep /></ProtectedRoute>} />
      <Route path="waitlist" element={<ProtectedRoute requiredPermission="view_booking_calendar"><Waitlist /></ProtectedRoute>} />
      <Route path="mixing" element={<ProtectedRoute><StylistMixingDashboard /></ProtectedRoute>} />
      <Route path="team-chat" element={<ProtectedRoute><TeamChat /></ProtectedRoute>} />
      <Route path="changelog" element={<ProtectedRoute><Changelog /></ProtectedRoute>} />
      <Route path="campaigns" element={<ProtectedRoute requiredPermission="view_team_overview"><Campaigns /></ProtectedRoute>} />
      <Route path="campaigns/:id" element={<ProtectedRoute requiredPermission="view_team_overview"><CampaignDetail /></ProtectedRoute>} />
      <Route path="metrics-glossary" element={<ProtectedRoute><MetricsGlossary /></ProtectedRoute>} />
      <Route path="design-system" element={<ProtectedRoute requiredPermission="manage_settings"><DesignSystem /></ProtectedRoute>} />
      <Route path="help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
      <Route path="help/:categorySlug" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
      <Route path="help/:categorySlug/:articleSlug" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="admin/team" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamOverview /></ProtectedRoute>} />
      <Route path="admin/strikes" element={<ProtectedRoute requiredPermission="manage_user_roles"><StaffStrikes /></ProtectedRoute>} />
      <Route path="admin/birthdays" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamBirthdays /></ProtectedRoute>} />
      <Route path="admin/onboarding-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><OnboardingTracker /></ProtectedRoute>} />
      <Route path="admin/account-management" element={<Navigate to="admin/onboarding-tracker?tab=invitations" replace />} />
      <Route path="admin/client-engine-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><ClientEngineTracker /></ProtectedRoute>} />
      <Route path="admin/assistant-requests" element={<ProtectedRoute requiredPermission="view_team_overview"><AssistantRequestsOverview /></ProtectedRoute>} />
      <Route path="admin/schedule-requests" element={<ProtectedRoute requiredPermission="manage_schedule_requests"><ScheduleRequests /></ProtectedRoute>} />
      <Route path="admin/handbooks" element={<ProtectedRoute requiredPermission="manage_handbooks"><Handbooks /></ProtectedRoute>} />
      <Route path="admin/announcements" element={<ProtectedRoute requiredPermission="manage_announcements"><AdminAnnouncements /></ProtectedRoute>} />
      <Route path="admin/website-hub" element={<ProtectedRoute requiredPermission="manage_settings"><WebsiteHub /></ProtectedRoute>} />
      <Route path="admin/homepage-stylists" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/testimonials" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/gallery" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/services" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/announcement-bar" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/locations" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/website-sections" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/roles" element={<Navigate to="admin/access-hub?tab=user-roles" replace />} />
      <Route path="admin/accounts" element={<Navigate to="admin/access-hub?tab=invitations" replace />} />
      <Route path="admin/stylist-levels" element={<ProtectedRoute requiredPermission="manage_settings"><StylistLevels /></ProtectedRoute>} />
      <Route path="admin/settings" element={<ProtectedRoute requiredPermission="manage_settings"><AdminSettings /></ProtectedRoute>} />
      <Route path="admin/business-cards" element={<ProtectedRoute requiredPermission="manage_settings"><BusinessCardRequests /></ProtectedRoute>} />
      <Route path="admin/headshots" element={<ProtectedRoute requiredPermission="manage_settings"><HeadshotRequests /></ProtectedRoute>} />
      <Route path="admin/build" element={<ProtectedRoute requiredPermission="view_dashboard_build"><DashboardBuild /></ProtectedRoute>} />
      <Route path="admin/recruiting" element={<ProtectedRoute requiredPermission="manage_user_roles"><RecruitingPipeline /></ProtectedRoute>} />
      <Route path="admin/graduation-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><GraduationTracker /></ProtectedRoute>} />
      <Route path="admin/program-editor" element={<ProtectedRoute requiredPermission="manage_program_editor"><ProgramEditor /></ProtectedRoute>} />
      <Route path="admin/phorest" element={<ProtectedRoute requiredPermission="manage_settings"><PhorestSettings /></ProtectedRoute>} />
      <Route path="admin/day-rate-settings" element={<ProtectedRoute requiredPermission="manage_settings"><DayRateSettings /></ProtectedRoute>} />
      <Route path="admin/day-rate-calendar" element={<ProtectedRoute requiredPermission="manage_settings"><DayRateCalendar /></ProtectedRoute>} />
      <Route path="admin/analytics" element={<ProtectedRoute requiredPermission="view_team_overview"><AnalyticsHub /></ProtectedRoute>} />
      <Route path="admin/management" element={<Navigate to="admin/team-hub" replace />} />
      <Route path="admin/training-hub" element={<ProtectedRoute requiredPermission="manage_handbooks"><TrainingHub /></ProtectedRoute>} />
      <Route path="admin/team-hub" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamHub /></ProtectedRoute>} />
      <Route path="admin/client-hub" element={<ProtectedRoute requiredPermission="view_clients"><ClientHub /></ProtectedRoute>} />
      <Route path="admin/growth-hub" element={<ProtectedRoute requiredPermission="view_team_overview"><GrowthHub /></ProtectedRoute>} />
      <Route path="admin/sales" element={<Navigate to="admin/analytics?tab=sales" replace />} />
      <Route path="admin/operational-analytics" element={<Navigate to="admin/analytics?tab=operations" replace />} />
      <Route path="admin/staff-utilization" element={<Navigate to="admin/analytics?tab=operations&subtab=staff-utilization" replace />} />
      <Route path="admin/marketing" element={<Navigate to="admin/analytics?tab=marketing" replace />} />
      <Route path="admin/program-analytics" element={<Navigate to="admin/analytics?tab=program" replace />} />
      <Route path="admin/reports" element={<Navigate to="admin/analytics?tab=reports" replace />} />
      <Route path="admin/leads" element={<ProtectedRoute requiredPermission="view_team_overview"><LeadManagement /></ProtectedRoute>} />
      <Route path="admin/feature-flags" element={<Navigate to="/platform/feature-flags" replace />} />

      <Route path="admin/zura-config" element={<ProtectedRoute requiredPermission="manage_settings"><ZuraConfigPage /></ProtectedRoute>} />
      <Route path="admin/color-bar-settings" element={<ProtectedRoute requiredPermission="manage_settings"><ColorBarSettings /></ProtectedRoute>} />
      <Route path="admin/color-bar-subscription" element={<ProtectedRoute requiredPermission="manage_settings"><ColorBarSubscription /></ProtectedRoute>} />
      <Route path="admin/price-recommendations" element={<Navigate to="admin/color-bar-settings?section=price-intelligence" replace />} />
      <Route path="admin/kpi-builder" element={<ProtectedRoute requiredPermission="manage_settings"><KpiBuilderPage /></ProtectedRoute>} />
      <Route path="admin/executive-brief" element={<ProtectedRoute requiredPermission="manage_settings"><ExecutiveBriefPage /></ProtectedRoute>} />
      <Route path="admin/decision-history" element={<ProtectedRoute requiredPermission="manage_settings"><DecisionHistoryPage /></ProtectedRoute>} />
      <Route path="admin/import" element={<ProtectedRoute requiredPermission="manage_settings"><DataImport /></ProtectedRoute>} />
      <Route path="admin/payroll" element={<ProtectedRoute requiredPermission="manage_payroll"><Payroll /></ProtectedRoute>} />
      <Route path="admin/payroll/callback" element={<ProtectedRoute requiredPermission="manage_payroll"><PayrollCallback /></ProtectedRoute>} />
      <Route path="transactions" element={<Navigate to="appointments-hub?tab=transactions" replace />} />
      <Route path="appointments-hub" element={<ProtectedRoute requiredPermission="view_transactions"><AppointmentsHub /></ProtectedRoute>} />
      <Route path="inventory" element={<ProtectedRoute requiredPermission="manage_inventory"><Inventory /></ProtectedRoute>} />
      <Route path="register" element={<ProtectedRoute requiredPermission="process_retail_sales"><Register /></ProtectedRoute>} />
      <Route path="settings/loyalty" element={<ProtectedRoute requiredPermission="manage_loyalty_program"><LoyaltyProgram /></ProtectedRoute>} />
      <Route path="admin/booth-renters" element={<ProtectedRoute requiredPermission="manage_booth_renters"><BoothRenters /></ProtectedRoute>} />
      <Route path="admin/feedback" element={<ProtectedRoute requiredPermission="manage_settings"><FeedbackHub /></ProtectedRoute>} />
      <Route path="admin/seo-workshop" element={<ProtectedRoute requiredPermission="view_team_overview"><SEOWorkshopHub /></ProtectedRoute>} />
      <Route path="admin/reengagement" element={<ProtectedRoute requiredPermission="manage_settings"><ReengagementHub /></ProtectedRoute>} />
      <Route path="admin/client-health" element={<ProtectedRoute requiredPermission="view_team_overview"><ClientHealthHub /></ProtectedRoute>} />
      <Route path="admin/features" element={<ProtectedRoute requiredPermission="manage_settings"><FeaturesCenter /></ProtectedRoute>} />
      <Route path="admin/merge-clients" element={<ProtectedRoute requiredPermission="client_merge"><MergeClients /></ProtectedRoute>} />
      <Route path="admin/access-hub" element={<ProtectedRoute requiredPermission="manage_settings"><AccessHub /></ProtectedRoute>} />

      {/* Team Challenges routes */}
      <Route path="admin/challenges" element={<ProtectedRoute requiredPermission="view_team_overview"><ChallengesDashboard /></ProtectedRoute>} />
      <Route path="admin/challenges/:challengeId" element={<ProtectedRoute requiredPermission="view_team_overview"><ChallengeDetail /></ProtectedRoute>} />

      {/* Shift Swap routes */}
      <Route path="shift-swaps" element={<ProtectedRoute><ShiftSwapMarketplace /></ProtectedRoute>} />
      <Route path="admin/shift-swaps" element={<ProtectedRoute requiredPermission="manage_schedule_requests"><ShiftSwapApprovals /></ProtectedRoute>} />

      {/* HR Tools Suite */}
      <Route path="admin/documents" element={<ProtectedRoute requiredPermission="view_team_overview"><DocumentTracker /></ProtectedRoute>} />
      <Route path="admin/performance-reviews" element={<ProtectedRoute requiredPermission="view_team_overview"><PerformanceReviews /></ProtectedRoute>} />
      <Route path="admin/pto" element={<ProtectedRoute requiredPermission="view_team_overview"><PTOManager /></ProtectedRoute>} />
      <Route path="admin/incidents" element={<ProtectedRoute requiredPermission="view_team_overview"><IncidentReports /></ProtectedRoute>} />
      <Route path="admin/new-hire" element={<ProtectedRoute requiredPermission="view_team_overview"><NewHireWizard /></ProtectedRoute>} />
      <Route path="admin/onboard-renter" element={<ProtectedRoute requiredPermission="manage_booth_renters"><RenterOnboardWizard /></ProtectedRoute>} />

      {/* Points Economy, Daily Huddle routes */}
      <Route path="rewards" element={<ProtectedRoute><RewardShop /></ProtectedRoute>} />
      <Route path="admin/points-config" element={<ProtectedRoute requiredPermission="manage_settings"><PointsConfig /></ProtectedRoute>} />
      <Route path="admin/daily-huddle" element={<ProtectedRoute requiredPermission="manage_announcements"><DailyHuddle /></ProtectedRoute>} />
      <Route path="admin/chair-assignments" element={<ProtectedRoute requiredPermission="view_team_overview"><ChairAssignments /></ProtectedRoute>} />

      {/* Renter Portal routes */}
      <Route path="renter/portal" element={<ProtectedRoute><RenterPortal /></ProtectedRoute>} />
      <Route path="renter/pay-rent" element={<ProtectedRoute><RenterPayRent /></ProtectedRoute>} />
      <Route path="renter/payment-methods" element={<ProtectedRoute><RenterPaymentMethods /></ProtectedRoute>} />
      <Route path="renter/commissions" element={<ProtectedRoute><RenterCommissions /></ProtectedRoute>} />
      <Route path="renter/tax-documents" element={<ProtectedRoute><RenterTaxDocuments /></ProtectedRoute>} />
    </>
  );
}

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="data-public-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="public-theme">
      <BrowserRouter>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeInitializer />
              <OrganizationProvider>
                <I18nLocaleSync />
                <DashboardThemeProvider>
                  <ViewAsProvider>
                    <HideNumbersProvider>
                      <SoundSettingsProvider>
                        <TooltipProvider delayDuration={0}>
                          <Toaster />
                          <Sonner />
                          
                          <ScrollToTop />
                          {import.meta.env.DEV && <DevContextBridge />}
                          <CommandMenu />
                          <Suspense fallback={<RouteFallback />}>
                            <Routes>
                            {/* Platform entry point */}
                            <Route path="/" element={<PlatformLanding />} />
                            <Route path="/login" element={<UnifiedLogin />} />

                            {/* Backward-compatible redirects */}
                            <Route path="/staff-login" element={<Navigate to="/login" replace />} />
                            <Route path="/platform-login" element={<Navigate to="/login" replace />} />

                            {/* Organization public pages */}
                            <Route path="/org/:orgSlug" element={<OrgPublicRoute />}>
                              <Route index element={<Index />} />
                              <Route path="about" element={<About />} />
                              <Route path="services" element={<Services />} />
                              <Route path="booking" element={<Booking />} />
                              <Route path="stylists" element={<Stylists />} />
                              <Route path="extensions" element={<Extensions />} />
                              <Route path="policies" element={<Policies />} />
                              <Route path="book" element={<PublicBooking />} />
                              <Route path="day-rate" element={<DayRateBooking />} />
                              <Route path="shop" element={<Shop />} />
                              <Route path=":pageSlug" element={<DynamicPage />} />
                            </Route>

                            {/* Standalone public pages */}
                            <Route path="/demo" element={<ProductDemo />} />
                            <Route path="/feedback" element={<ClientFeedbackPage />} />
                            <Route path="/rewards" element={<ClientPortalPage />} />
                            <Route path="/kiosk/:locationId" element={<Kiosk />} />
                            <Route path="/dock" element={<Dock />} />

                            {/* ══════════════════════════════════════════════════
                                PRIMARY: Org-scoped dashboard — /org/:orgSlug/dashboard/*
                                OrgDashboardRoute resolves the org from URL slug.
                               ══════════════════════════════════════════════════ */}
                            <Route path="/org/:orgSlug/dashboard" element={<OrgDashboardRoute />}>
                              {DashboardRoutes()}
                            </Route>

                            {/* ══════════════════════════════════════════════════
                                LEGACY: /dashboard/* → redirect to /org/:slug/dashboard/*
                                LegacyDashboardRedirect resolves slug from context.
                               ══════════════════════════════════════════════════ */}
                            <Route path="/dashboard/*" element={<LegacyDashboardRedirect />} />

                            {/* Platform Admin routes */}
                            <Route path="/platform" element={<ProtectedRoute requireAnyPlatformRole><PlatformLayout /></ProtectedRoute>}>
                              <Route index element={<Navigate to="overview" replace />} />
                              <Route path="overview" element={<PlatformOverview />} />
                              <Route path="accounts" element={<PlatformAccounts />} />
                              <Route path="accounts/:orgId" element={<AccountDetail />} />
                              <Route path="health-scores" element={<ProtectedRoute requirePlatformRole="platform_support"><HealthScoresPage /></ProtectedRoute>} />
                              <Route path="benchmarks" element={<ProtectedRoute requirePlatformRole="platform_admin"><BenchmarksPage /></ProtectedRoute>} />
                              <Route path="onboarding" element={<PlatformOnboarding />} />
                              <Route path="import" element={<PlatformImport />} />
                              <Route path="audit-log" element={<AuditLogPage />} />
                              <Route path="jobs" element={<JobsPage />} />
                              <Route path="health" element={<SystemHealthPage />} />
                              <Route path="stripe-health" element={<StripeHealthPage />} />
                              <Route path="notifications" element={<ProtectedRoute requirePlatformRole="platform_admin"><NotificationsPage /></ProtectedRoute>} />
                              <Route path="analytics" element={<ProtectedRoute requirePlatformRole="platform_owner"><PlatformAnalytics /></ProtectedRoute>} />
                              <Route path="knowledge-base" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformKnowledgeBase /></ProtectedRoute>} />
                              <Route path="revenue" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformRevenue /></ProtectedRoute>} />
                              <Route path="billing-guide" element={<BillingGuide />} />
                              <Route path="settings" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformSettings /></ProtectedRoute>} />
                              <Route path="settings/integrations/:integrationId" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformIntegrationDetail /></ProtectedRoute>} />
                              <Route path="permissions" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformPermissions /></ProtectedRoute>} />
                              <Route path="feature-flags" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformFeatureFlags /></ProtectedRoute>} />
                              <Route path="color-bar" element={<ProtectedRoute requirePlatformRole="platform_admin"><ColorBarAdmin /></ProtectedRoute>} />
                              <Route path="coach" element={<ProtectedRoute requireAnyPlatformRole><CoachDashboard /></ProtectedRoute>} />
                              <Route path="demo-features" element={<ProtectedRoute requirePlatformRole="platform_admin"><DemoFeatures /></ProtectedRoute>} />
                            </Route>

                            <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </TooltipProvider>
                      </SoundSettingsProvider>
                    </HideNumbersProvider>
                  </ViewAsProvider>
                </DashboardThemeProvider>
              </OrganizationProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
