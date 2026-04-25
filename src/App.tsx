import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "./components/ScrollToTop";
import { BootLuxeLoader } from "@/components/ui/BootLuxeLoader";

import { AuthProvider } from "./contexts/AuthContext";
import { ViewAsProvider } from "./contexts/ViewAsContext";
import { HideNumbersProvider } from "./contexts/HideNumbersContext";
import { RevenueDisplayProvider } from "./contexts/RevenueDisplayContext";
import { DashboardThemeProvider } from "./contexts/DashboardThemeContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { SoundSettingsProvider } from "./contexts/SoundSettingsContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { CapitalFeatureGate } from "./components/features/CapitalFeatureGate";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { AnimationIntensityInitializer } from "./components/AnimationIntensityInitializer";
import { I18nLocaleSync } from "./components/I18nLocaleSync";
import { DevContextBridge } from "./dev/DevContextBridge";
import { ErrorBoundary } from "./components/ErrorBoundary";

import { OrgDashboardRoute, LegacyDashboardRedirect } from "./components/OrgDashboardRoute";

// Platform pages
import PlatformLanding from "./pages/PlatformLanding";
import Ecosystem from "./pages/Ecosystem";
import Product from "./pages/Product";
import UnifiedLogin from "./pages/UnifiedLogin";
import OrgBrandedLogin from "./pages/OrgBrandedLogin";
import NoOrganization from "./pages/NoOrganization";
import NotFound from "./pages/NotFound";
const PricingPage = lazyWithRetry(() => import("./pages/Pricing"));
const InteractiveDemo = lazyWithRetry(() => import("./pages/InteractiveDemo"));
const Signup = lazyWithRetry(() => import("./pages/auth/Signup"));
const VerifyEmail = lazyWithRetry(() => import("./pages/auth/VerifyEmail"));
const OrganizationSetup = lazyWithRetry(() => import("./pages/onboarding/OrganizationSetup"));
import DashboardHome from "./pages/dashboard/DashboardHome";

// Organization public pages (under /org/:orgSlug)
import { OrgPublicRoute } from "./components/org/OrgPublicRoute";
import ClientPolicyCenter from "./pages/public/ClientPolicyCenter";

// Dashboard pages
import { OrgAccessDenied } from "./components/auth/OrgAccessDenied";

function AccessDeniedPreview() {
  return <OrgAccessDenied organizationName="Luxe Hair Studio" />;
}


// Team Challenges & Shift Swaps

// HR Tools Suite

// Engagement Features: Points, Huddles, Training Enhancements

// V1 Zura Intelligence

// Team Chat

// Client Engagement Tools

// Renter Portal pages

// Platform Admin pages

function RouteFallback() {
  return <BootLuxeLoader fullScreen />;
}
const Index = lazyWithRetry(() => import("./pages/Index"));
const Services = lazyWithRetry(() => import("./pages/Services"));
const About = lazyWithRetry(() => import("./pages/About"));
const Booking = lazyWithRetry(() => import("./pages/Booking"));
const Stylists = lazyWithRetry(() => import("./pages/Stylists"));
const Extensions = lazyWithRetry(() => import("./pages/Extensions"));
const Policies = lazyWithRetry(() => import("./pages/Policies"));
const Shop = lazyWithRetry(() => import("./pages/Shop"));
const DynamicPage = lazyWithRetry(() => import("./pages/DynamicPage"));
const Program = lazyWithRetry(() => import("./pages/dashboard/Program"));
const RingTheBell = lazyWithRetry(() => import("./pages/dashboard/RingTheBell"));
const Leaderboard = lazyWithRetry(() => import("./pages/dashboard/Leaderboard"));
const Training = lazyWithRetry(() => import("./pages/dashboard/Training"));
const Progress = lazyWithRetry(() => import("./pages/dashboard/Progress"));
const Stats = lazyWithRetry(() => import("./pages/dashboard/Stats"));
const WeeklyWins = lazyWithRetry(() => import("./pages/dashboard/WeeklyWins"));
const TeamOverview = lazyWithRetry(() => import("./pages/dashboard/admin/TeamOverview"));
const Handbooks = lazyWithRetry(() => import("./pages/dashboard/admin/Handbooks"));
const AdminPolicies = lazyWithRetry(() => import("./pages/dashboard/admin/Policies"));
const PolicyConflictCenter = lazyWithRetry(() => import("./pages/dashboard/admin/PolicyConflictCenter"));
const HandbookDashboard = lazyWithRetry(() => import("./pages/dashboard/admin/HandbookDashboard"));
const HandbookWizard = lazyWithRetry(() => import("./pages/dashboard/admin/HandbookWizard"));
const AdminSettings = lazyWithRetry(() => import("./pages/dashboard/admin/Settings"));
const TeamMembers = lazyWithRetry(() => import("./pages/dashboard/admin/TeamMembers"));
const TeamMemberDetail = lazyWithRetry(() => import("./pages/dashboard/admin/TeamMemberDetail"));
const AdminAnnouncements = lazyWithRetry(() => import("./pages/dashboard/admin/Announcements"));
const HomepageStylists = lazyWithRetry(() => import("./pages/dashboard/admin/HomepageStylists"));
const AccountManagement = lazyWithRetry(() => import("./pages/dashboard/admin/AccountManagement"));
const TestimonialsManager = lazyWithRetry(() => import("./pages/dashboard/admin/TestimonialsManager"));
const ServicesManager = lazyWithRetry(() => import("./pages/dashboard/admin/ServicesManager"));
const AnnouncementBarManager = lazyWithRetry(() => import("./pages/dashboard/admin/AnnouncementBarManager"));
const StylistLevels = lazyWithRetry(() => import("./pages/dashboard/admin/StylistLevels"));
const CompensationHub = lazyWithRetry(() => import("./pages/dashboard/admin/CompensationHub"));
const CompensationPlanEditor = lazyWithRetry(() => import("./pages/dashboard/admin/CompensationPlanEditor"));
const LocationsManager = lazyWithRetry(() => import("./pages/dashboard/admin/LocationsManager"));
const WebsiteSectionsHub = lazyWithRetry(() => import("./pages/dashboard/admin/WebsiteSectionsHub"));
const TeamBirthdays = lazyWithRetry(() => import("./pages/dashboard/admin/TeamBirthdays"));
const StaffStrikes = lazyWithRetry(() => import("./pages/dashboard/admin/StaffStrikes"));
const BusinessCardRequests = lazyWithRetry(() => import("./pages/dashboard/admin/BusinessCardRequests"));
const HeadshotRequests = lazyWithRetry(() => import("./pages/dashboard/admin/HeadshotRequests"));
const MyHandbooks = lazyWithRetry(() => import("./pages/dashboard/MyHandbooks"));
const Onboarding = lazyWithRetry(() => import("./pages/dashboard/Onboarding"));
const AssistantSchedule = lazyWithRetry(() => import("./pages/dashboard/AssistantSchedule"));
const ScheduleMeeting = lazyWithRetry(() => import("./pages/dashboard/ScheduleMeeting"));
const ScheduleNewMeeting = lazyWithRetry(() => import("./pages/dashboard/meetings/ScheduleNewMeeting"));
const MyMeetings = lazyWithRetry(() => import("./pages/dashboard/meetings/MyMeetings"));
const CoachRequests = lazyWithRetry(() => import("./pages/dashboard/meetings/CoachRequests"));
const Commitments = lazyWithRetry(() => import("./pages/dashboard/meetings/Commitments"));
const MeetingInbox = lazyWithRetry(() => import("./pages/dashboard/meetings/MeetingInbox"));
const MeetingDetails = lazyWithRetry(() => import("./pages/dashboard/MeetingDetails"));
const MyProfile = lazyWithRetry(() => import("./pages/dashboard/MyProfile"));
const ViewProfile = lazyWithRetry(() => import("./pages/dashboard/ViewProfile"));
const TeamDirectory = lazyWithRetry(() => import("./pages/dashboard/TeamDirectory"));
const NotificationPreferences = lazyWithRetry(() => import("./pages/dashboard/NotificationPreferences"));
const OnboardingTracker = lazyWithRetry(() => import("./pages/dashboard/admin/OnboardingTracker"));
const ClientEngineTracker = lazyWithRetry(() => import("./pages/dashboard/admin/ClientEngineTracker"));
const AssistantRequestsOverview = lazyWithRetry(() => import("./pages/dashboard/admin/AssistantRequestsOverview"));
const ScheduleRequests = lazyWithRetry(() => import("./pages/dashboard/admin/ScheduleRequests"));
const DashboardBuild = lazyWithRetry(() => import("./pages/dashboard/admin/DashboardBuild"));
const RecruitingPipeline = lazyWithRetry(() => import("./pages/dashboard/admin/RecruitingPipeline"));
const GraduationTracker = lazyWithRetry(() => import("./pages/dashboard/admin/GraduationTracker"));
const MyGraduation = lazyWithRetry(() => import("./pages/dashboard/MyGraduation"));
const DesignSystem = lazyWithRetry(() => import("./pages/dashboard/DesignSystem"));
const ProgramEditor = lazyWithRetry(() => import("./pages/dashboard/admin/ProgramEditor"));
const PhorestSettings = lazyWithRetry(() => import("./pages/dashboard/admin/PhorestSettings"));
const AnalyticsHub = lazyWithRetry(() => import("./pages/dashboard/admin/AnalyticsHub"));
const ManagementHub = lazyWithRetry(() => import("./pages/dashboard/admin/ManagementHub"));
const TrainingHub = lazyWithRetry(() => import("./pages/dashboard/admin/TrainingHub"));
const TeamHub = lazyWithRetry(() => import("./pages/dashboard/admin/TeamHub"));
const PaymentOps = lazyWithRetry(() => import("./pages/dashboard/admin/PaymentOps"));
const ClientHub = lazyWithRetry(() => import("./pages/dashboard/admin/ClientHub"));
const GrowthHub = lazyWithRetry(() => import("./pages/dashboard/admin/GrowthHub"));
const WebsiteHub = lazyWithRetry(() => import("./pages/dashboard/admin/WebsiteHub"));
const LeadManagement = lazyWithRetry(() => import("./pages/dashboard/admin/LeadManagement"));
const AdminFeatureFlags = lazyWithRetry(() => import("./pages/dashboard/admin/FeatureFlags"));
const FeaturesCenter = lazyWithRetry(() => import("./pages/dashboard/admin/FeaturesCenter"));
const AccessHub = lazyWithRetry(() => import("./pages/dashboard/admin/AccessHub"));
const PlatformFeatureFlags = lazyWithRetry(() => import("./pages/dashboard/platform/FeatureFlags"));
const ClientDirectory = lazyWithRetry(() => import("./pages/dashboard/ClientDirectory"));
const Schedule = lazyWithRetry(() => import("./pages/dashboard/Schedule"));
const AllNotifications = lazyWithRetry(() => import("./pages/dashboard/AllNotifications"));
const Changelog = lazyWithRetry(() => import("./pages/dashboard/Changelog"));
const StylistMixingDashboard = lazyWithRetry(() => import("./pages/dashboard/StylistMixingDashboard"));
const MetricsGlossary = lazyWithRetry(() => import("./pages/dashboard/MetricsGlossary"));
const AppsMarketplace = lazyWithRetry(() => import("./pages/dashboard/AppsMarketplace"));
const PublicBooking = lazyWithRetry(() => import("./pages/PublicBooking"));
const BookingSurface = lazyWithRetry(() => import("./pages/BookingSurface"));
const DayRateBooking = lazyWithRetry(() => import("./pages/DayRateBooking"));
const ProductDemo = lazyWithRetry(() => import("./pages/ProductDemo"));
const SolIndependent = lazyWithRetry(() => import("./pages/solutions/IndependentStylist"));
const SolSalonOwner = lazyWithRetry(() => import("./pages/solutions/SalonOwner"));
const SolMultiLocation = lazyWithRetry(() => import("./pages/solutions/MultiLocation"));
const SolEnterprise = lazyWithRetry(() => import("./pages/solutions/Enterprise"));
const SolScheduling = lazyWithRetry(() => import("./pages/solutions/Scheduling"));
const SolInventory = lazyWithRetry(() => import("./pages/solutions/Inventory"));
const SolTeam = lazyWithRetry(() => import("./pages/solutions/Team"));
const Kiosk = lazyWithRetry(() => import("./pages/Kiosk"));
const Dock = lazyWithRetry(() => import("./pages/Dock"));
const DayRateSettings = lazyWithRetry(() => import("./pages/dashboard/admin/DayRateSettings"));
const DayRateCalendar = lazyWithRetry(() => import("./pages/dashboard/admin/DayRateCalendar"));
const DataImport = lazyWithRetry(() => import("./pages/dashboard/admin/DataImport"));
const ChairAssignments = lazyWithRetry(() => import("./pages/dashboard/admin/ChairAssignments"));
const Payroll = lazyWithRetry(() => import("./pages/dashboard/admin/Payroll"));
const PayrollCallback = lazyWithRetry(() => import("./pages/dashboard/admin/PayrollCallback"));
const HelpCenter = lazyWithRetry(() => import("./pages/dashboard/HelpCenter"));
const MyPay = lazyWithRetry(() => import("./pages/dashboard/MyPay"));
const SpatialAuditPage = lazyWithRetry(() => import("./pages/dashboard/_internal/SpatialAuditPage"));
const PolicyLintPage = lazyWithRetry(() => import("./pages/dashboard/_internal/PolicyLintPage"));
// Transactions merged into AppointmentsHub
const AppointmentsHub = lazyWithRetry(() => import("./pages/dashboard/AppointmentsHub"));
const Inventory = lazyWithRetry(() => import("./pages/dashboard/Inventory"));
const Register = lazyWithRetry(() => import("./pages/dashboard/Register"));
const TodayPrep = lazyWithRetry(() => import("./pages/dashboard/TodayPrep"));
const Waitlist = lazyWithRetry(() => import("./pages/dashboard/Waitlist"));
const LoyaltyProgram = lazyWithRetry(() => import("./pages/dashboard/settings/LoyaltyProgram"));
const BoothRenters = lazyWithRetry(() => import("./pages/dashboard/admin/BoothRenters"));
const ChallengesDashboard = lazyWithRetry(() => import("./pages/dashboard/admin/ChallengesDashboard"));
const ChallengeDetail = lazyWithRetry(() => import("./pages/dashboard/admin/ChallengeDetail"));
const ShiftSwapMarketplace = lazyWithRetry(() => import("./pages/dashboard/ShiftSwapMarketplace"));
const ShiftSwapApprovals = lazyWithRetry(() => import("./pages/dashboard/admin/ShiftSwapApprovals"));
const DocumentTracker = lazyWithRetry(() => import("./pages/dashboard/admin/DocumentTracker"));
const PerformanceReviews = lazyWithRetry(() => import("./pages/dashboard/admin/PerformanceReviews"));
const PTOManager = lazyWithRetry(() => import("./pages/dashboard/admin/PTOManager"));
const IncidentReports = lazyWithRetry(() => import("./pages/dashboard/admin/IncidentReports"));
const NewHireWizard = lazyWithRetry(() => import("./pages/dashboard/admin/NewHireWizard"));
const RenterOnboardWizard = lazyWithRetry(() => import("./pages/dashboard/admin/RenterOnboardWizard"));
const ReportsHub = lazyWithRetry(() => import("./pages/dashboard/admin/ReportsHub"));
const RewardShop = lazyWithRetry(() => import("./pages/dashboard/RewardShop"));
const PointsConfig = lazyWithRetry(() => import("./pages/dashboard/admin/PointsConfig"));
const DailyHuddle = lazyWithRetry(() => import("./pages/dashboard/admin/DailyHuddle"));
const ZuraConfigPage = lazyWithRetry(() => import("./pages/dashboard/admin/ZuraConfigPage"));
const ColorBarSettings = lazyWithRetry(() => import("./pages/dashboard/admin/ColorBarSettings"));
const ColorBarSubscription = lazyWithRetry(() => import("./pages/dashboard/admin/ColorBarSubscription"));
const PriceRecommendations = lazyWithRetry(() => import("./pages/dashboard/admin/PriceRecommendations"));
const KpiBuilderPage = lazyWithRetry(() => import("./pages/dashboard/admin/KpiBuilderPage"));
const ExecutiveBriefPage = lazyWithRetry(() => import("./pages/dashboard/admin/ExecutiveBriefPage"));
const DecisionHistoryPage = lazyWithRetry(() => import("./pages/dashboard/admin/DecisionHistoryPage"));
const TeamChat = lazyWithRetry(() => import("./pages/dashboard/TeamChat"));
const Campaigns = lazyWithRetry(() => import("./pages/dashboard/Campaigns"));
const CampaignDetail = lazyWithRetry(() => import("./pages/dashboard/CampaignDetail"));
const ClientFeedbackPage = lazyWithRetry(() => import("./pages/ClientFeedback"));
const ClientPortalPage = lazyWithRetry(() => import("./pages/ClientPortal"));
const FeedbackHub = lazyWithRetry(() => import("./pages/dashboard/admin/FeedbackHub"));
const SEOWorkshopHub = lazyWithRetry(() => import("./pages/dashboard/admin/SEOWorkshopHub"));
const ReengagementHub = lazyWithRetry(() => import("./pages/dashboard/admin/ReengagementHub"));
const ClientHealthHub = lazyWithRetry(() => import("./pages/dashboard/admin/ClientHealthHub"));
const MergeClients = lazyWithRetry(() => import("./pages/dashboard/admin/MergeClients"));
const RenterPortal = lazyWithRetry(() => import("./pages/dashboard/RenterPortal"));
const RenterPayRent = lazyWithRetry(() => import("./pages/dashboard/RenterPayRent"));
const RenterPaymentMethods = lazyWithRetry(() => import("./pages/dashboard/RenterPaymentMethods"));
const RenterCommissions = lazyWithRetry(() => import("./pages/dashboard/RenterCommissions"));
const RenterTaxDocuments = lazyWithRetry(() => import("./pages/dashboard/RenterTaxDocuments"));
const PlatformOverview = lazyWithRetry(() => import("./pages/dashboard/platform/Overview"));
const PlatformAccounts = lazyWithRetry(() => import("./pages/dashboard/platform/Accounts"));
const AccountDetail = lazyWithRetry(() => import("./pages/dashboard/platform/AccountDetail"));
const PlatformImport = lazyWithRetry(() => import("./pages/dashboard/platform/PlatformImport"));
const PlatformSettings = lazyWithRetry(() => import("./pages/dashboard/platform/PlatformSettings"));
const PlatformRevenue = lazyWithRetry(() => import("./pages/dashboard/platform/Revenue"));
const PlatformPermissions = lazyWithRetry(() => import("./pages/dashboard/platform/Permissions"));
const PlatformIntegrationDetail = lazyWithRetry(() => import("./pages/dashboard/platform/PlatformIntegrationDetail"));
const PlatformKnowledgeBase = lazyWithRetry(() => import("./pages/dashboard/platform/KnowledgeBase"));
const PlatformOnboarding = lazyWithRetry(() => import("./pages/dashboard/platform/Onboarding"));
const PlatformAnalytics = lazyWithRetry(() => import("./pages/dashboard/platform/Analytics"));
const PlatformSetupFunnel = lazyWithRetry(() => import("./pages/dashboard/platform/SetupFunnel"));
const AuditLogPage = lazyWithRetry(() => import("./pages/dashboard/platform/AuditLog"));
const JobsPage = lazyWithRetry(() => import("./pages/dashboard/platform/Jobs"));
const SystemHealthPage = lazyWithRetry(() => import("./pages/dashboard/platform/SystemHealth"));
const PaymentsHealthPage = lazyWithRetry(() => import("./pages/dashboard/platform/StripeHealth"));
const NotificationsPage = lazyWithRetry(() => import("./pages/dashboard/platform/Notifications"));
const DemoFeatures = lazyWithRetry(() => import("./pages/dashboard/platform/DemoFeatures"));
const HealthScoresPage = lazyWithRetry(() => import("./pages/dashboard/platform/HealthScores"));
const BenchmarksPage = lazyWithRetry(() => import("./pages/dashboard/platform/Benchmarks"));
const ColorBarAdmin = lazyWithRetry(() => import("./pages/dashboard/platform/ColorBarAdmin"));
const CoachDashboard = lazyWithRetry(() => import("./pages/dashboard/platform/CoachDashboard"));
const BillingGuide = lazyWithRetry(() => import("./pages/dashboard/platform/BillingGuide"));
const PlatformNetwork = lazyWithRetry(() => import("./pages/dashboard/platform/Network"));
const CapitalControlTower = lazyWithRetry(() => import("./pages/dashboard/platform/CapitalControlTower"));
const CapitalKnowledgeBase = lazyWithRetry(() => import("./pages/dashboard/platform/CapitalKnowledgeBase"));
const PlatformLayout = lazyWithRetry(() => import("./components/platform/layout/PlatformLayout").then((module) => ({ default: module.PlatformLayout })));
const TeamCalendar = lazyWithRetry(() => import("./pages/dashboard/TeamCalendar"));
const SalesDashboard = lazyWithRetry(() => import("./pages/dashboard/admin/SalesDashboard"));
const CapitalQueue = lazyWithRetry(() => import("./pages/dashboard/admin/CapitalQueue"));
const CapitalOpportunityDetail = lazyWithRetry(() => import("./pages/dashboard/admin/CapitalOpportunityDetail"));
const CapitalProjects = lazyWithRetry(() => import("./pages/dashboard/admin/CapitalProjects"));
const CapitalProjectDetail = lazyWithRetry(() => import("./pages/dashboard/admin/CapitalProjectDetail"));
const CapitalSettings = lazyWithRetry(() => import("./pages/dashboard/admin/CapitalSettings"));
const BookingSurfaceSettingsPage = lazyWithRetry(() => import("./pages/dashboard/admin/BookingSurfaceSettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s global default — prevents redundant refetches on navigation/tab switches
    },
  },
});

function PrivateAppShell() {
  return (
    <OrganizationProvider>
      <I18nLocaleSync />
      <DashboardThemeProvider>
        <ViewAsProvider>
          <HideNumbersProvider>
            <RevenueDisplayProvider>
              <SoundSettingsProvider>
                {import.meta.env.DEV && <DevContextBridge />}
                
                <Outlet />
              </SoundSettingsProvider>
            </RevenueDisplayProvider>
          </HideNumbersProvider>
        </ViewAsProvider>
      </DashboardThemeProvider>
    </OrganizationProvider>
  );
}

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
      <Route path="_internal/spatial-audit" element={<ProtectedRoute><SpatialAuditPage /></ProtectedRoute>} />
      <Route path="_internal/policy-lint" element={<ProtectedRoute requireAnyPlatformRole><PolicyLintPage /></ProtectedRoute>} />
      <Route path="schedule" element={<ProtectedRoute requiredPermission="view_booking_calendar"><Schedule /></ProtectedRoute>} />
      <Route path="team-calendar" element={<ProtectedRoute requiredPermission="view_booking_calendar"><TeamCalendar /></ProtectedRoute>} />
      <Route path="today-prep" element={<ProtectedRoute requiredPermission="view_booking_calendar"><TodayPrep /></ProtectedRoute>} />
      <Route path="waitlist" element={<ProtectedRoute requiredPermission="view_booking_calendar"><Waitlist /></ProtectedRoute>} />
      <Route path="mixing" element={<ProtectedRoute><StylistMixingDashboard /></ProtectedRoute>} />
      <Route path="team-chat" element={<ProtectedRoute><TeamChat /></ProtectedRoute>} />
      <Route path="apps" element={<ProtectedRoute><AppsMarketplace /></ProtectedRoute>} />
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
      <Route path="admin/strikes" element={<Navigate to="../admin/incidents?tab=strikes" replace />} />
      <Route path="admin/birthdays" element={<ProtectedRoute requiredPermission="view_team_overview"><TeamBirthdays /></ProtectedRoute>} />
      <Route path="admin/onboarding-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><OnboardingTracker /></ProtectedRoute>} />
      <Route path="admin/account-management" element={<Navigate to="admin/onboarding-tracker?tab=invitations" replace />} />
      <Route path="admin/client-engine-tracker" element={<ProtectedRoute requiredPermission="view_team_overview"><ClientEngineTracker /></ProtectedRoute>} />
      <Route path="admin/assistant-requests" element={<ProtectedRoute requiredPermission="view_team_overview"><AssistantRequestsOverview /></ProtectedRoute>} />
      <Route path="admin/schedule-requests" element={<ProtectedRoute requiredPermission="manage_schedule_requests"><ScheduleRequests /></ProtectedRoute>} />
      <Route path="admin/handbooks" element={<ProtectedRoute requiredPermission="manage_handbooks"><Handbooks /></ProtectedRoute>} />
      <Route path="admin/policies" element={<ProtectedRoute requiredPermission="manage_handbooks"><AdminPolicies /></ProtectedRoute>} />
      <Route path="admin/policy/conflicts" element={<ProtectedRoute requiredPermission="manage_handbooks"><PolicyConflictCenter /></ProtectedRoute>} />
      <Route path="admin/handbook-wizard" element={<Navigate to="../handbooks?tab=wizard" replace />} />
      <Route path="admin/handbook-wizard/:handbookId/edit" element={<ProtectedRoute requiredPermission="manage_handbooks"><HandbookWizard /></ProtectedRoute>} />
      <Route path="admin/handbook" element={<Navigate to="../handbooks?tab=wizard" replace />} />
      <Route path="admin/announcements" element={<ProtectedRoute requiredPermission="manage_announcements"><AdminAnnouncements /></ProtectedRoute>} />
      <Route path="admin/website-hub" element={<ProtectedRoute requiredPermission="manage_settings"><WebsiteHub /></ProtectedRoute>} />
      <Route path="admin/homepage-stylists" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/testimonials" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/gallery" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/services" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/announcement-bar" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/locations" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/website-sections" element={<Navigate to="admin/website-hub" replace />} />
      <Route path="admin/roles" element={<Navigate to="admin/access-hub?tab=role-config" replace />} />
      <Route path="admin/accounts" element={<Navigate to="admin/team-members?view=invitations" replace />} />
      <Route path="admin/stylist-levels" element={<ProtectedRoute requiredPermission="manage_settings"><StylistLevels /></ProtectedRoute>} />
      <Route path="admin/compensation" element={<ProtectedRoute requiredPermission="manage_settings"><CompensationHub /></ProtectedRoute>} />
      <Route path="admin/compensation/:planId" element={<ProtectedRoute requiredPermission="manage_settings"><CompensationPlanEditor /></ProtectedRoute>} />
      <Route path="admin/settings" element={<ProtectedRoute requiredPermission="manage_settings"><AdminSettings /></ProtectedRoute>} />
      <Route path="admin/team-members" element={<ProtectedRoute requiredPermission="manage_settings"><TeamMembers /></ProtectedRoute>} />
      <Route path="admin/team-members/:userId" element={<ProtectedRoute requiredPermission="manage_settings"><TeamMemberDetail /></ProtectedRoute>} />
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
      <Route path="admin/payment-ops" element={<ProtectedRoute requiredPermission="view_team_overview"><PaymentOps /></ProtectedRoute>} />
      <Route path="admin/client-hub" element={<ProtectedRoute requiredPermission="view_clients"><ClientHub /></ProtectedRoute>} />
      <Route path="admin/growth-hub" element={<ProtectedRoute requiredPermission="view_team_overview"><GrowthHub /></ProtectedRoute>} />
      <Route path="admin/sales" element={<Navigate to="admin/analytics?tab=sales" replace />} />
      <Route path="admin/operational-analytics" element={<Navigate to="admin/analytics?tab=operations" replace />} />
      <Route path="admin/staff-utilization" element={<Navigate to="admin/analytics?tab=operations&subtab=staff-utilization" replace />} />
      <Route path="admin/marketing" element={<Navigate to="admin/analytics?tab=marketing" replace />} />
      <Route path="admin/program-analytics" element={<Navigate to="admin/analytics?tab=program" replace />} />
      <Route path="admin/reports" element={<ProtectedRoute requiredPermission="view_team_overview"><ReportsHub /></ProtectedRoute>} />
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

      {/* Zura Capital routes — gated by capital_enabled flag + super admin / primary owner only */}
      <Route path="admin/capital" element={<ProtectedRoute requireSuperAdmin><CapitalFeatureGate fallback={<Navigate to=".." replace />}><CapitalQueue /></CapitalFeatureGate></ProtectedRoute>} />
      <Route path="admin/capital/opportunities/:opportunityId" element={<ProtectedRoute requireSuperAdmin><CapitalFeatureGate fallback={<Navigate to="../.." replace />}><CapitalOpportunityDetail /></CapitalFeatureGate></ProtectedRoute>} />
      <Route path="admin/capital/projects" element={<ProtectedRoute requireSuperAdmin><CapitalFeatureGate fallback={<Navigate to=".." replace />}><CapitalProjects /></CapitalFeatureGate></ProtectedRoute>} />
      <Route path="admin/capital/projects/:projectId" element={<ProtectedRoute requireSuperAdmin><CapitalFeatureGate fallback={<Navigate to="../.." replace />}><CapitalProjectDetail /></CapitalFeatureGate></ProtectedRoute>} />
      <Route path="admin/capital/settings" element={<ProtectedRoute requireSuperAdmin><CapitalFeatureGate fallback={<Navigate to=".." replace />}><CapitalSettings /></CapitalFeatureGate></ProtectedRoute>} />
      <Route path="admin/booking-surface" element={<ProtectedRoute requiredPermission="manage_settings"><BookingSurfaceSettingsPage /></ProtectedRoute>} />

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
              <AnimationIntensityInitializer />
              <TooltipProvider delayDuration={0}>
                <Toaster />
                <Sonner />
                <ScrollToTop />
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {/* Platform entry point */}
                    <Route path="/" element={<PlatformLanding />} />
                    <Route path="/product" element={<Product />} />
                    <Route path="/ecosystem" element={<Ecosystem />} />
                    <Route path="/login" element={<UnifiedLogin />} />
                    <Route path="/org/:orgSlug/login" element={<OrgBrandedLogin />} />
                    <Route path="/org/:orgSlug/loc/:locationId/login" element={<OrgBrandedLogin />} />
                    <Route path="/no-organization" element={<NoOrganization />} />
                    <Route path="/signup" element={<Suspense fallback={<RouteFallback />}><Signup /></Suspense>} />
                    <Route path="/auth/verify-email" element={<Suspense fallback={<RouteFallback />}><VerifyEmail /></Suspense>} />
                    <Route path="/onboarding/setup" element={<Suspense fallback={<RouteFallback />}><OrganizationSetup /></Suspense>} />

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
                      <Route path="policies" element={<ClientPolicyCenter />} />
                      <Route path="policies-legacy" element={<Policies />} />
                      <Route path="book" element={<PublicBooking />} />
                      <Route path="day-rate" element={<DayRateBooking />} />
                      <Route path="shop" element={<Shop />} />
                      <Route path=":pageSlug" element={<DynamicPage />} />
                    </Route>

                    {/* Standalone public pages */}
                    <Route path="/pricing" element={<Suspense fallback={<RouteFallback />}><PricingPage /></Suspense>} />
                    <Route path="/demo" element={<ProductDemo />} />
                    <Route path="/explore" element={<Suspense fallback={<RouteFallback />}><InteractiveDemo /></Suspense>} />
                    <Route path="/about" element={<Suspense fallback={<RouteFallback />}><About /></Suspense>} />
                    <Route path="/solutions/independent" element={<SolIndependent />} />
                    <Route path="/solutions/salon-owner" element={<SolSalonOwner />} />
                    <Route path="/solutions/multi-location" element={<SolMultiLocation />} />
                    <Route path="/solutions/enterprise" element={<SolEnterprise />} />
                    <Route path="/solutions/scheduling" element={<SolScheduling />} />
                    <Route path="/solutions/inventory" element={<SolInventory />} />
                    <Route path="/solutions/team" element={<SolTeam />} />
                    <Route path="/feedback" element={<ClientFeedbackPage />} />
                    <Route path="/rewards" element={<ClientPortalPage />} />
                    <Route path="/kiosk/:locationId" element={<Kiosk />} />
                    <Route path="/dock" element={<Dock />} />
                    <Route path="/book/:orgSlug" element={<BookingSurface />} />
                    {/* TEMP: Preview access denied page — remove after review */}
                    <Route path="/_preview/access-denied" element={<AccessDeniedPreview />} />

                    <Route element={<PrivateAppShell />}>
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
                        <Route path="payments-health" element={<PaymentsHealthPage />} />
                        <Route path="notifications" element={<ProtectedRoute requirePlatformRole="platform_admin"><NotificationsPage /></ProtectedRoute>} />
                        <Route path="analytics" element={<ProtectedRoute requirePlatformRole="platform_owner"><PlatformAnalytics /></ProtectedRoute>} />
                        <Route path="setup-funnel" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformSetupFunnel /></ProtectedRoute>} />
                        <Route path="network" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformNetwork /></ProtectedRoute>} />
                        <Route path="knowledge-base" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformKnowledgeBase /></ProtectedRoute>} />
                        <Route path="revenue" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformRevenue /></ProtectedRoute>} />
                        <Route path="billing-guide" element={<BillingGuide />} />
                        <Route path="settings" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformSettings /></ProtectedRoute>} />
                        <Route path="settings/integrations/:integrationId" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformIntegrationDetail /></ProtectedRoute>} />
                        <Route path="permissions" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformPermissions /></ProtectedRoute>} />
                        <Route path="feature-flags" element={<ProtectedRoute requirePlatformRole="platform_admin"><PlatformFeatureFlags /></ProtectedRoute>} />
                        <Route path="color-bar" element={<ProtectedRoute requirePlatformRole="platform_admin"><ColorBarAdmin /></ProtectedRoute>} />
                        <Route path="capital" element={<ProtectedRoute requirePlatformRole="platform_admin"><CapitalControlTower /></ProtectedRoute>} />
                        <Route path="capital/guide" element={<ProtectedRoute requirePlatformRole="platform_admin"><CapitalKnowledgeBase /></ProtectedRoute>} />
                        <Route path="coach" element={<ProtectedRoute requireAnyPlatformRole><CoachDashboard /></ProtectedRoute>} />
                        <Route path="demo-features" element={<ProtectedRoute requirePlatformRole="platform_admin"><DemoFeatures /></ProtectedRoute>} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
