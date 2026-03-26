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
import Dock from "./pages/Dock";
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
import PriceRecommendations from "./pages/dashboard/admin/PriceRecommendations";

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
import BillingGuide from "./pages/dashboard/platform/BillingGuide";
import { PlatformLayout } from "./components/platform/layout/PlatformLayout";
import TeamCalendar from "./pages/dashboard/TeamCalendar";
import SalesDashboard from "./pages/dashboard/admin/SalesDashboard";

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
      <Route path="admin/backroom-settings" element={<ProtectedRoute requiredPermission="manage_settings"><BackroomSettings /></ProtectedRoute>} />
      <Route path="admin/backroom-subscription" element={<ProtectedRoute requiredPermission="manage_settings"><BackroomSubscription /></ProtectedRoute>} />
      <Route path="admin/price-recommendations" element={<Navigate to="admin/backroom-settings?section=price-intelligence" replace />} />
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
                              <Route path="backroom" element={<ProtectedRoute requirePlatformRole="platform_admin"><BackroomAdmin /></ProtectedRoute>} />
                              <Route path="coach" element={<ProtectedRoute requireAnyPlatformRole><CoachDashboard /></ProtectedRoute>} />
                              <Route path="demo-features" element={<ProtectedRoute requirePlatformRole="platform_admin"><DemoFeatures /></ProtectedRoute>} />
                            </Route>

                            <Route path="*" element={<NotFound />} />
                          </Routes>
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
