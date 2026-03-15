import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "./components/ScrollToTop";
import { CustomCursor } from "./components/ui/CustomCursor";
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

// Platform pages
import PlatformLanding from "./pages/PlatformLanding";
import UnifiedLogin from "./pages/UnifiedLogin";
import NotFound from "./pages/NotFound";

// Organization public pages (under /org/:orgSlug)
import Index from "./pages/Index";
import Services from "./pages/Services";
import About from "./pages/About";
import Booking from "./pages/Booking";
import Stylists from "./pages/Stylists";
import Extensions from "./pages/Extensions";
import Policies from "./pages/Policies";
import Shop from "./pages/Shop";
import DynamicPage from "./pages/DynamicPage";
import { OrgPublicRoute } from "./components/org/OrgPublicRoute";

// Dashboard pages
import DashboardHome from "./pages/dashboard/DashboardHome";
import Program from "./pages/dashboard/Program";
import RingTheBell from "./pages/dashboard/RingTheBell";
import Leaderboard from "./pages/dashboard/Leaderboard";
import Training from "./pages/dashboard/Training";
import Progress from "./pages/dashboard/Progress";
import Stats from "./pages/dashboard/Stats";
import WeeklyWins from "./pages/dashboard/WeeklyWins";
import TeamOverview from "./pages/dashboard/admin/TeamOverview";
import Handbooks from "./pages/dashboard/admin/Handbooks";
import AdminSettings from "./pages/dashboard/admin/Settings";
import AdminAnnouncements from "./pages/dashboard/admin/Announcements";
import HomepageStylists from "./pages/dashboard/admin/HomepageStylists";
// ManageRoles removed - consolidated into AccessHub
import AccountManagement from "./pages/dashboard/admin/AccountManagement";
import TestimonialsManager from "./pages/dashboard/admin/TestimonialsManager";
import ServicesManager from "./pages/dashboard/admin/ServicesManager";
import AnnouncementBarManager from "./pages/dashboard/admin/AnnouncementBarManager";
import StylistLevels from "./pages/dashboard/admin/StylistLevels";
import LocationsManager from "./pages/dashboard/admin/LocationsManager";
import WebsiteSectionsHub from "./pages/dashboard/admin/WebsiteSectionsHub";

import TeamBirthdays from "./pages/dashboard/admin/TeamBirthdays";
import StaffStrikes from "./pages/dashboard/admin/StaffStrikes";
import BusinessCardRequests from "./pages/dashboard/admin/BusinessCardRequests";
import HeadshotRequests from "./pages/dashboard/admin/HeadshotRequests";
import MyHandbooks from "./pages/dashboard/MyHandbooks";
import Onboarding from "./pages/dashboard/Onboarding";
import AssistantSchedule from "./pages/dashboard/AssistantSchedule";
import ScheduleMeeting from "./pages/dashboard/ScheduleMeeting";
import ScheduleNewMeeting from "./pages/dashboard/meetings/ScheduleNewMeeting";
import MyMeetings from "./pages/dashboard/meetings/MyMeetings";
import CoachRequests from "./pages/dashboard/meetings/CoachRequests";
import Commitments from "./pages/dashboard/meetings/Commitments";
import MeetingInbox from "./pages/dashboard/meetings/MeetingInbox";
import MeetingDetails from "./pages/dashboard/MeetingDetails";
import MyProfile from "./pages/dashboard/MyProfile";
import ViewProfile from "./pages/dashboard/ViewProfile";
import TeamDirectory from "./pages/dashboard/TeamDirectory";
import NotificationPreferences from "./pages/dashboard/NotificationPreferences";
import OnboardingTracker from "./pages/dashboard/admin/OnboardingTracker";
import ClientEngineTracker from "./pages/dashboard/admin/ClientEngineTracker";
import AssistantRequestsOverview from "./pages/dashboard/admin/AssistantRequestsOverview";
import ScheduleRequests from "./pages/dashboard/admin/ScheduleRequests";
import DashboardBuild from "./pages/dashboard/admin/DashboardBuild";
import RecruitingPipeline from "./pages/dashboard/admin/RecruitingPipeline";
import GraduationTracker from "./pages/dashboard/admin/GraduationTracker";
import MyGraduation from "./pages/dashboard/MyGraduation";
import DesignSystem from "./pages/dashboard/DesignSystem";
import ProgramEditor from "./pages/dashboard/admin/ProgramEditor";
import PhorestSettings from "./pages/dashboard/admin/PhorestSettings";
import AnalyticsHub from "./pages/dashboard/admin/AnalyticsHub";
import ManagementHub from "./pages/dashboard/admin/ManagementHub";
import TrainingHub from "./pages/dashboard/admin/TrainingHub";
import TeamHub from "./pages/dashboard/admin/TeamHub";
import ClientHub from "./pages/dashboard/admin/ClientHub";
import GrowthHub from "./pages/dashboard/admin/GrowthHub";
import WebsiteHub from "./pages/dashboard/admin/WebsiteHub";
import LeadManagement from "./pages/dashboard/admin/LeadManagement";
import AdminFeatureFlags from "./pages/dashboard/admin/FeatureFlags";
import FeaturesCenter from "./pages/dashboard/admin/FeaturesCenter";
import AccessHub from "./pages/dashboard/admin/AccessHub";
import PlatformFeatureFlags from "./pages/dashboard/platform/FeatureFlags";
import ClientDirectory from "./pages/dashboard/ClientDirectory";
import Schedule from "./pages/dashboard/Schedule";
import AllNotifications from "./pages/dashboard/AllNotifications";
import Changelog from "./pages/dashboard/Changelog";
import StylistMixingDashboard from "./pages/dashboard/StylistMixingDashboard";

import MetricsGlossary from "./pages/dashboard/MetricsGlossary";
import PublicBooking from "./pages/PublicBooking";
import DayRateBooking from "./pages/DayRateBooking";
import ProductDemo from "./pages/ProductDemo";
import Kiosk from "./pages/Kiosk";
import DayRateSettings from "./pages/dashboard/admin/DayRateSettings";
import DayRateCalendar from "./pages/dashboard/admin/DayRateCalendar";
import DataImport from "./pages/dashboard/admin/DataImport";
import ChairAssignments from "./pages/dashboard/admin/ChairAssignments";
import Payroll from "./pages/dashboard/admin/Payroll";
import PayrollCallback from "./pages/dashboard/admin/PayrollCallback";
import HelpCenter from "./pages/dashboard/HelpCenter";
import MyPay from "./pages/dashboard/MyPay";
import Transactions from "./pages/dashboard/Transactions";
import AppointmentsHub from "./pages/dashboard/AppointmentsHub";
import Inventory from "./pages/dashboard/Inventory";
import Register from "./pages/dashboard/Register";
import TodayPrep from "./pages/dashboard/TodayPrep";
import Waitlist from "./pages/dashboard/Waitlist";
import LoyaltyProgram from "./pages/dashboard/settings/LoyaltyProgram";
import BoothRenters from "./pages/dashboard/admin/BoothRenters";

// Team Challenges & Shift Swaps
import ChallengesDashboard from "./pages/dashboard/admin/ChallengesDashboard";
import ChallengeDetail from "./pages/dashboard/admin/ChallengeDetail";
import ShiftSwapMarketplace from "./pages/dashboard/ShiftSwapMarketplace";
import ShiftSwapApprovals from "./pages/dashboard/admin/ShiftSwapApprovals";

// HR Tools Suite
import DocumentTracker from "./pages/dashboard/admin/DocumentTracker";
import PerformanceReviews from "./pages/dashboard/admin/PerformanceReviews";
import PTOManager from "./pages/dashboard/admin/PTOManager";
import IncidentReports from "./pages/dashboard/admin/IncidentReports";
import NewHireWizard from "./pages/dashboard/admin/NewHireWizard";
import RenterOnboardWizard from "./pages/dashboard/admin/RenterOnboardWizard";

// Engagement Features: Points, Huddles, Training Enhancements
import RewardShop from "./pages/dashboard/RewardShop";
import PointsConfig from "./pages/dashboard/admin/PointsConfig";
import DailyHuddle from "./pages/dashboard/admin/DailyHuddle";
import ZuraConfigPage from "./pages/dashboard/admin/ZuraConfigPage";
import BackroomSettings from "./pages/dashboard/admin/BackroomSettings";
import BackroomSubscription from "./pages/dashboard/admin/BackroomSubscription";

// V1 Zura Intelligence
import KpiBuilderPage from "./pages/dashboard/admin/KpiBuilderPage";
import ExecutiveBriefPage from "./pages/dashboard/admin/ExecutiveBriefPage";
import DecisionHistoryPage from "./pages/dashboard/admin/DecisionHistoryPage";

// Team Chat
import TeamChat from "./pages/dashboard/TeamChat";
import Campaigns from "./pages/dashboard/Campaigns";
import CampaignDetail from "./pages/dashboard/CampaignDetail";

// Client Engagement Tools
import ClientFeedbackPage from "./pages/ClientFeedback";
import ClientPortalPage from "./pages/ClientPortal";
import FeedbackHub from "./pages/dashboard/admin/FeedbackHub";
import SEOWorkshopHub from "./pages/dashboard/admin/SEOWorkshopHub";
import ReengagementHub from "./pages/dashboard/admin/ReengagementHub";
import ClientHealthHub from "./pages/dashboard/admin/ClientHealthHub";
import MergeClients from "./pages/dashboard/admin/MergeClients";

// Renter Portal pages
import RenterPortal from "./pages/dashboard/RenterPortal";
import RenterPayRent from "./pages/dashboard/RenterPayRent";
import RenterPaymentMethods from "./pages/dashboard/RenterPaymentMethods";
import RenterCommissions from "./pages/dashboard/RenterCommissions";
import RenterTaxDocuments from "./pages/dashboard/RenterTaxDocuments";

// Platform Admin pages
import PlatformOverview from "./pages/dashboard/platform/Overview";
import PlatformAccounts from "./pages/dashboard/platform/Accounts";
import AccountDetail from "./pages/dashboard/platform/AccountDetail";
import PlatformImport from "./pages/dashboard/platform/PlatformImport";
import PlatformSettings from "./pages/dashboard/platform/PlatformSettings";
import PlatformRevenue from "./pages/dashboard/platform/Revenue";
import PlatformPermissions from "./pages/dashboard/platform/Permissions";
import PlatformIntegrationDetail from "./pages/dashboard/platform/PlatformIntegrationDetail";
import PlatformKnowledgeBase from "./pages/dashboard/platform/KnowledgeBase";
import PlatformOnboarding from "./pages/dashboard/platform/Onboarding";
import PlatformAnalytics from "./pages/dashboard/platform/Analytics";
import AuditLogPage from "./pages/dashboard/platform/AuditLog";
import JobsPage from "./pages/dashboard/platform/Jobs";
import SystemHealthPage from "./pages/dashboard/platform/SystemHealth";
import StripeHealthPage from "./pages/dashboard/platform/StripeHealth";
import NotificationsPage from "./pages/dashboard/platform/Notifications";
import DemoFeatures from "./pages/dashboard/platform/DemoFeatures";
import HealthScoresPage from "./pages/dashboard/platform/HealthScores";
import BenchmarksPage from "./pages/dashboard/platform/Benchmarks";
import BackroomAdmin from "./pages/dashboard/platform/BackroomAdmin";
import CoachDashboard from "./pages/dashboard/platform/CoachDashboard";
import { PlatformLayout } from "./components/platform/layout/PlatformLayout";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="data-public-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="public-theme">
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
                        <BrowserRouter>
                          <CustomCursor />
                          <ScrollToTop />
                          {import.meta.env.DEV && <DevContextBridge />}
                          <CommandMenu />
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

                      {/* Standalone public pages (not org-scoped) */}
                      <Route path="/demo" element={<ProductDemo />} />
                      <Route path="/feedback" element={<ClientFeedbackPage />} />
                      <Route path="/rewards" element={<ClientPortalPage />} />
                      <Route path="/kiosk/:locationId" element={<Kiosk />} />

                      {/* Protected dashboard routes */}
                      <Route path="/dashboard" element={<ProtectedRoute requiredPermission="view_command_center"><DashboardHome /></ProtectedRoute>} />
                      <Route path="/dashboard/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
                      <Route path="/dashboard/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
                      <Route path="/dashboard/notifications/all" element={<ProtectedRoute><AllNotifications /></ProtectedRoute>} />
                      <Route path="/dashboard/profile/:userId" element={<ProtectedRoute requiredPermission="view_any_profile"><ViewProfile /></ProtectedRoute>} />
                      <Route path="/dashboard/directory" element={<ProtectedRoute requiredPermission="view_team_directory"><TeamDirectory /></ProtectedRoute>} />
                      <Route path="/dashboard/program" element={<ProtectedRoute requiredPermission="access_client_engine"><Program /></ProtectedRoute>} />
                      <Route path="/dashboard/progress" element={<ProtectedRoute requiredPermission="access_client_engine"><Progress /></ProtectedRoute>} />
<Route path="/dashboard/stats" element={<ProtectedRoute requiredPermission="view_own_stats"><Stats /></ProtectedRoute>} />
                      <Route path="/dashboard/leaderboard" element={<ProtectedRoute requiredPermission="view_leaderboard"><Leaderboard /></ProtectedRoute>} />
                      <Route path="/dashboard/ring-the-bell" element={<ProtectedRoute requiredPermission="ring_the_bell"><RingTheBell /></ProtectedRoute>} />
                      <Route path="/dashboard/training" element={<ProtectedRoute requiredPermission="view_training"><Training /></ProtectedRoute>} />
                      <Route path="/dashboard/weekly-wins" element={<ProtectedRoute requiredPermission="access_client_engine"><WeeklyWins /></ProtectedRoute>} />
                      <Route path="/dashboard/handbooks" element={<ProtectedRoute requiredPermission="view_handbooks"><MyHandbooks /></ProtectedRoute>} />
                      <Route path="/dashboard/onboarding" element={<ProtectedRoute requiredPermission="view_onboarding"><Onboarding /></ProtectedRoute>} />
                      <Route path="/dashboard/assistant-schedule" element={<ProtectedRoute requiredPermission="view_assistant_schedule"><AssistantSchedule /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule-meeting" element={<ProtectedRoute requiredPermission="schedule_meetings"><ScheduleMeeting /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule-meeting/new" element={<ProtectedRoute requiredPermission="schedule_meetings"><ScheduleNewMeeting /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule-meeting/my-meetings" element={<ProtectedRoute requiredPermission="schedule_meetings"><MyMeetings /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule-meeting/requests" element={<ProtectedRoute requiredPermission="schedule_meetings"><CoachRequests /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule-meeting/commitments" element={<ProtectedRoute requiredPermission="schedule_meetings"><Commitments /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule-meeting/inbox" element={<ProtectedRoute requiredPermission="schedule_meetings"><MeetingInbox /></ProtectedRoute>} />
                      <Route path="/dashboard/meeting/:id" element={<ProtectedRoute requiredPermission="schedule_meetings"><MeetingDetails /></ProtectedRoute>} />
                      <Route path="/dashboard/my-graduation" element={<ProtectedRoute requiredPermission="view_my_graduation"><MyGraduation /></ProtectedRoute>} />
                      <Route path="/dashboard/clients" element={<ProtectedRoute requiredPermission="view_clients"><ClientDirectory /></ProtectedRoute>} />
                      <Route path="/dashboard/my-clients" element={<Navigate to="/dashboard/clients" replace />} />
                      <Route path="/dashboard/my-pay" element={<ProtectedRoute requiredPermission="view_my_pay"><MyPay /></ProtectedRoute>} />
                      <Route path="/dashboard/schedule" element={<ProtectedRoute requiredPermission="view_booking_calendar"><Schedule /></ProtectedRoute>} />
                      <Route path="/dashboard/today-prep" element={<ProtectedRoute requiredPermission="view_booking_calendar"><TodayPrep /></ProtectedRoute>} />
                      <Route path="/dashboard/waitlist" element={<ProtectedRoute requiredPermission="view_booking_calendar"><Waitlist /></ProtectedRoute>} />
                      <Route path="/dashboard/mixing" element={<ProtectedRoute><StylistMixingDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/team-chat" element={<ProtectedRoute><TeamChat /></ProtectedRoute>} />
                      <Route path="/dashboard/changelog" element={<ProtectedRoute><Changelog /></ProtectedRoute>} />
                      <Route path="/dashboard/campaigns" element={<ProtectedRoute requiredPermission="view_team_overview"><Campaigns /></ProtectedRoute>} />
                      <Route path="/dashboard/campaigns/:id" element={<ProtectedRoute requiredPermission="view_team_overview"><CampaignDetail /></ProtectedRoute>} />
                      <Route path="/dashboard/metrics-glossary" element={<ProtectedRoute><MetricsGlossary /></ProtectedRoute>} />
                      <Route path="/dashboard/design-system" element={<ProtectedRoute requiredPermission="manage_settings"><DesignSystem /></ProtectedRoute>} />
                      <Route path="/dashboard/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
                      <Route path="/dashboard/help/:categorySlug" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
                      <Route path="/dashboard/help/:categorySlug/:articleSlug" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
                      
                      {/* Admin routes */}
                      <Route path="/dashboard/admin/team" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamOverview /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/strikes" element={<ProtectedRoute requiredPermission="manage_user_roles"><StaffStrikes /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/birthdays" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamBirthdays /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/onboarding-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><OnboardingTracker /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/account-management" element={<Navigate to="/dashboard/admin/onboarding-tracker?tab=invitations" replace />} />
                      <Route path="/dashboard/admin/client-engine-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><ClientEngineTracker /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/assistant-requests" element={<ProtectedRoute requiredPermission="view_team_overview"><AssistantRequestsOverview /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/schedule-requests" element={<ProtectedRoute requiredPermission="manage_schedule_requests"><ScheduleRequests /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/handbooks" element={<ProtectedRoute requiredPermission="manage_handbooks"><Handbooks /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/announcements" element={<ProtectedRoute requiredPermission="manage_announcements"><AdminAnnouncements /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/website-hub" element={<ProtectedRoute requiredPermission="manage_settings"><WebsiteHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/homepage-stylists" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/testimonials" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/gallery" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/services" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/announcement-bar" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/locations" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/website-sections" element={<Navigate to="/dashboard/admin/website-hub" replace />} />
                      <Route path="/dashboard/admin/roles" element={<Navigate to="/dashboard/admin/access-hub?tab=user-roles" replace />} />
                      <Route path="/dashboard/admin/accounts" element={<Navigate to="/dashboard/admin/access-hub?tab=invitations" replace />} />
                      <Route path="/dashboard/admin/stylist-levels" element={<ProtectedRoute requiredPermission="manage_settings"><StylistLevels /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/settings" element={<ProtectedRoute requiredPermission="manage_settings"><AdminSettings /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/business-cards" element={<ProtectedRoute requiredPermission="manage_settings"><BusinessCardRequests /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/headshots" element={<ProtectedRoute requiredPermission="manage_settings"><HeadshotRequests /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/build" element={<ProtectedRoute requiredPermission="view_dashboard_build"><DashboardBuild /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/recruiting" element={<ProtectedRoute requiredPermission="manage_user_roles"><RecruitingPipeline /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/graduation-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><GraduationTracker /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/program-editor" element={<ProtectedRoute requiredPermission="manage_program_editor"><ProgramEditor /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/phorest" element={<ProtectedRoute requiredPermission="manage_settings"><PhorestSettings /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/day-rate-settings" element={<ProtectedRoute requiredPermission="manage_settings"><DayRateSettings /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/day-rate-calendar" element={<ProtectedRoute requiredPermission="manage_settings"><DayRateCalendar /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/analytics" element={<ProtectedRoute requiredPermission="view_team_overview"><AnalyticsHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/management" element={<Navigate to="/dashboard/admin/team-hub" replace />} />
                      <Route path="/dashboard/admin/training-hub" element={<ProtectedRoute requiredPermission="manage_handbooks"><TrainingHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/team-hub" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/client-hub" element={<ProtectedRoute requiredPermission="view_clients"><ClientHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/growth-hub" element={<ProtectedRoute requiredPermission="view_team_overview"><GrowthHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/sales" element={<Navigate to="/dashboard/admin/analytics?tab=sales" replace />} />
                      <Route path="/dashboard/admin/operational-analytics" element={<Navigate to="/dashboard/admin/analytics?tab=operations" replace />} />
                      <Route path="/dashboard/admin/staff-utilization" element={<Navigate to="/dashboard/admin/analytics?tab=operations&subtab=staff-utilization" replace />} />
                      <Route path="/dashboard/admin/marketing" element={<Navigate to="/dashboard/admin/analytics?tab=marketing" replace />} />
                      <Route path="/dashboard/admin/program-analytics" element={<Navigate to="/dashboard/admin/analytics?tab=program" replace />} />
                      <Route path="/dashboard/admin/reports" element={<Navigate to="/dashboard/admin/analytics?tab=reports" replace />} />
                      <Route path="/dashboard/admin/leads" element={<ProtectedRoute requiredPermission="view_team_overview"><LeadManagement /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/feature-flags" element={<Navigate to="/dashboard/platform/feature-flags" replace />} />
                      
                      <Route path="/dashboard/admin/zura-config" element={<ProtectedRoute requiredPermission="manage_settings"><ZuraConfigPage /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/backroom-settings" element={<ProtectedRoute requiredPermission="manage_settings"><BackroomSettings /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/backroom-subscription" element={<ProtectedRoute requiredPermission="manage_settings"><BackroomSubscription /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/kpi-builder" element={<ProtectedRoute requiredPermission="manage_settings"><KpiBuilderPage /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/executive-brief" element={<ProtectedRoute requiredPermission="manage_settings"><ExecutiveBriefPage /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/decision-history" element={<ProtectedRoute requiredPermission="manage_settings"><DecisionHistoryPage /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/import" element={<ProtectedRoute requiredPermission="manage_settings"><DataImport /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/payroll" element={<ProtectedRoute requiredPermission="manage_payroll"><Payroll /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/payroll/callback" element={<ProtectedRoute requiredPermission="manage_payroll"><PayrollCallback /></ProtectedRoute>} />
                      <Route path="/dashboard/transactions" element={<Navigate to="/dashboard/appointments-hub?tab=transactions" replace />} />
                      <Route path="/dashboard/appointments-hub" element={<ProtectedRoute requiredPermission="view_transactions"><AppointmentsHub /></ProtectedRoute>} />
                      <Route path="/dashboard/inventory" element={<ProtectedRoute requiredPermission="manage_inventory"><Inventory /></ProtectedRoute>} />
                      <Route path="/dashboard/register" element={<ProtectedRoute requiredPermission="process_retail_sales"><Register /></ProtectedRoute>} />
                      <Route path="/dashboard/settings/loyalty" element={<ProtectedRoute requiredPermission="manage_loyalty_program"><LoyaltyProgram /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/booth-renters" element={<ProtectedRoute requiredPermission="manage_booth_renters"><BoothRenters /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/feedback" element={<ProtectedRoute requiredPermission="manage_settings"><FeedbackHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/seo-workshop" element={<ProtectedRoute requiredPermission="view_team_overview"><SEOWorkshopHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/reengagement" element={<ProtectedRoute requiredPermission="manage_settings"><ReengagementHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/client-health" element={<ProtectedRoute requiredPermission="view_team_overview"><ClientHealthHub /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/features" element={<ProtectedRoute requiredPermission="manage_settings"><FeaturesCenter /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/merge-clients" element={<ProtectedRoute requiredPermission="client_merge"><MergeClients /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/access-hub" element={<ProtectedRoute requiredPermission="manage_settings"><AccessHub /></ProtectedRoute>} />
                      
                      {/* Team Challenges routes */}
                      <Route path="/dashboard/admin/challenges" element={<ProtectedRoute requiredPermission="view_team_overview"><ChallengesDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/challenges/:challengeId" element={<ProtectedRoute requiredPermission="view_team_overview"><ChallengeDetail /></ProtectedRoute>} />
                      
                      {/* Shift Swap routes */}
                      <Route path="/dashboard/shift-swaps" element={<ProtectedRoute><ShiftSwapMarketplace /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/shift-swaps" element={<ProtectedRoute requiredPermission="manage_schedule_requests"><ShiftSwapApprovals /></ProtectedRoute>} />
                      
                      {/* HR Tools Suite */}
                      <Route path="/dashboard/admin/documents" element={<ProtectedRoute requiredPermission="view_team_overview"><DocumentTracker /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/performance-reviews" element={<ProtectedRoute requiredPermission="view_team_overview"><PerformanceReviews /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/pto" element={<ProtectedRoute requiredPermission="view_team_overview"><PTOManager /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/incidents" element={<ProtectedRoute requiredPermission="view_team_overview"><IncidentReports /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/new-hire" element={<ProtectedRoute requiredPermission="view_team_overview"><NewHireWizard /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/onboard-renter" element={<ProtectedRoute requiredPermission="manage_booth_renters"><RenterOnboardWizard /></ProtectedRoute>} />
                      
                      {/* Phase 3: Points Economy, Daily Huddle routes */}
                      <Route path="/dashboard/rewards" element={<ProtectedRoute><RewardShop /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/points-config" element={<ProtectedRoute requiredPermission="manage_settings"><PointsConfig /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/daily-huddle" element={<ProtectedRoute requiredPermission="manage_announcements"><DailyHuddle /></ProtectedRoute>} />
                      <Route path="/dashboard/admin/chair-assignments" element={<ProtectedRoute requiredPermission="view_team_overview"><ChairAssignments /></ProtectedRoute>} />

                      {/* Renter Portal routes - booth_renter role users can access */}
                      <Route path="/dashboard/renter/portal" element={<ProtectedRoute><RenterPortal /></ProtectedRoute>} />
                      <Route path="/dashboard/renter/pay-rent" element={<ProtectedRoute><RenterPayRent /></ProtectedRoute>} />
                      <Route path="/dashboard/renter/payment-methods" element={<ProtectedRoute><RenterPaymentMethods /></ProtectedRoute>} />
                      <Route path="/dashboard/renter/commissions" element={<ProtectedRoute><RenterCommissions /></ProtectedRoute>} />
                      <Route path="/dashboard/renter/tax-documents" element={<ProtectedRoute><RenterTaxDocuments /></ProtectedRoute>} />

                      {/* Platform Admin routes - nested under PlatformLayout with sidebar */}
                      <Route path="/dashboard/platform" element={<ProtectedRoute requireAnyPlatformRole><PlatformLayout /></ProtectedRoute>}>
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
                        <Route path="settings" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformSettings /></ProtectedRoute>} />
                        <Route path="settings/integrations/:integrationId" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformIntegrationDetail /></ProtectedRoute>} />
                        <Route path="permissions" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformPermissions /></ProtectedRoute>} />
                        <Route path="feature-flags" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformFeatureFlags /></ProtectedRoute>} />
                        <Route path="backroom" element={<ProtectedRoute requirePlatformRole="platform_admin"><BackroomAdmin /></ProtectedRoute>} />
                        <Route path="demo-features" element={<ProtectedRoute requirePlatformRole="platform_admin"><DemoFeatures /></ProtectedRoute>} />
                      </Route>

                        <Route path="*" element={<NotFound />} />
                        </Routes>
                        </BrowserRouter>
                      </TooltipProvider>
                    </SoundSettingsProvider>
                  </HideNumbersProvider>
                </ViewAsProvider>
              </DashboardThemeProvider>
            </OrganizationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
