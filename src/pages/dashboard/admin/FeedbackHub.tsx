import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  MessageSquareText,
  BarChart3,
  Globe,
  Sparkles,
  Settings,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { NPSScoreCard } from '@/components/feedback/NPSScoreCard';
import { RecoverySLAWidget } from '@/components/feedback/RecoverySLAWidget';
import { ReviewVelocityCard } from '@/components/feedback/ReviewVelocityCard';
import { ResponseRateCard, PublicConversionCard } from '@/components/feedback/ReviewFunnelCards';
import { TodaysMustTouchStrip } from '@/components/feedback/TodaysMustTouchStrip';
import { AIWeeklyFeedbackSummary } from '@/components/feedback/AIWeeklyFeedbackSummary';
import { NegativeFeedbackThemes } from '@/components/feedback/NegativeFeedbackThemes';
import { FeedbackTrendDriftCard } from '@/components/feedback/FeedbackTrendDriftCard';
import { NegativeReviewHeatmap } from '@/components/feedback/NegativeReviewHeatmap';
import { CoachingLoopCard } from '@/components/feedback/CoachingLoopCard';
import { StylistReputationCard } from '@/components/feedback/StylistReputationCard';
import { ServiceSatisfactionBriefCard } from '@/components/feedback/ServiceSatisfactionBriefCard';
import { PraiseWall } from '@/components/feedback/PraiseWall';
import { RecoveryOutcomeCard } from '@/components/feedback/RecoveryOutcomeCard';
import { ParkedDispatchCard } from '@/components/feedback/ParkedDispatchCard';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';
import { ComplianceExportButton } from '@/components/feedback/ComplianceExportButton';
import { ReviewsTable } from '@/components/feedback/ReviewsTable';
import { OnlinePresenceTab } from '@/components/feedback/OnlinePresenceTab';
import { AutoBoostTelemetryCard } from '@/components/feedback/AutoBoostTelemetryCard';
import { ReputationSettingsTab } from '@/components/feedback/ReputationSettingsTab';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEffect, useState } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { ReputationGate } from '@/components/reputation/ReputationGate';
import { ReputationSubscriptionCard } from '@/components/reputation/ReputationSubscriptionCard';
import { ReputationGlossary } from '@/components/feedback/ReputationGlossary';
import { useRecoverySLA } from '@/hooks/useRecoverySLA';
import { toast } from 'sonner';

const FEEDBACK_TABS = new Set(['overview', 'reviews', 'presence', 'intelligence', 'settings']);

function getGoogleOAuthErrorMessage(code: string) {
  switch (code) {
    case 'access_denied':
      return 'Google sign-in was cancelled before the connection finished.';
    case 'invalid_state':
      return 'The Google connection session expired. Please try Connect Google again.';
    case 'token_exchange':
      return 'Google accepted the login, but did not issue tokens to finish the connection.';
    case 'db_write':
      return 'Google returned successfully, but the connection could not be saved yet.';
    case 'missing_params':
      return 'Google returned an incomplete callback. Please try again.';
    case 'server_error':
      return 'The Google connection hit a server error before it could finish.';
    default:
      return `Google returned: ${code.replace(/_/g, ' ')}.`;
  }
}

export default function FeedbackHub() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const googleConnected = searchParams.get('google_connected');
  const googleOAuthError = searchParams.get('google_oauth_error');
  const initialTab = requestedTab && FEEDBACK_TABS.has(requestedTab) ? requestedTab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { data: slaData } = useRecoverySLA();
  const hasBreached = (slaData?.breachedSLA ?? 0) > 0;
  const breachedCount = slaData?.breachedSLA ?? 0;
  const hasAnyActivity = !!slaData && (slaData.open + slaData.contacted + slaData.resolved) > 0;

  useEffect(() => {
    if (requestedTab && FEEDBACK_TABS.has(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!googleConnected && !googleOAuthError) return;

    setActiveTab('presence');

    if (googleConnected === '1') {
      toast.success('Google Business Profile connected.');
    }

    if (googleOAuthError) {
      toast.error('Google connection failed.', {
        description: getGoogleOAuthErrorMessage(googleOAuthError),
      });
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('google_connected');
    nextParams.delete('google_oauth_error');
    nextParams.set('tab', 'presence');
    setSearchParams(nextParams, { replace: true });
  }, [googleConnected, googleOAuthError, searchParams, setSearchParams]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link to={dashPath('/apps')}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-medium flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Online Reputation
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                See how your clients feel, send happy ones to leave reviews, and reach out fast when something goes wrong.
              </p>
            </div>
          </div>
          <ReputationGlossary />
        </div>

        <ReputationGate surfaceLabel="Online Reputation">
          <div className="mb-2">
            <ReputationSubscriptionCard />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <MessageSquareText className="h-4 w-4" /> Reviews
              </TabsTrigger>
              <TabsTrigger value="presence" className="gap-2">
                <Globe className="h-4 w-4" /> Online Presence
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="gap-2">
                <Sparkles className="h-4 w-4" /> Intelligence
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" /> Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <TodaysMustTouchStrip />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {hasBreached ? (
                  <>
                    <RecoverySLAWidget />
                    <NPSScoreCard organizationId={organizationId} />
                  </>
                ) : (
                  <>
                    <NPSScoreCard organizationId={organizationId} />
                    <RecoverySLAWidget />
                  </>
                )}
                <ResponseRateCard />
                <PublicConversionCard />
                <ReviewVelocityCard />
              </div>
              <AutoBoostTelemetryCard />
              <AIWeeklyFeedbackSummary />
              <Card>
                <CardContent className="p-4 text-xs text-muted-foreground flex items-center justify-between gap-3">
                  <span>Compliance log is immutable. Export for audit on demand.</span>
                  <ComplianceExportButton />
                </CardContent>
              </Card>
              <ComplianceBanner />
            </TabsContent>

            {/* Reviews — first-party post-visit table */}
            <TabsContent value="reviews" className="mt-6">
              <ReviewsTable organizationId={organizationId} />
            </TabsContent>

            {/* Online Presence — third-party connectors + auto-boost */}
            <TabsContent value="presence" className="mt-6">
              <OnlinePresenceTab organizationId={organizationId} />
            </TabsContent>

            {/* Intelligence — Zura's edge */}
            <TabsContent value="intelligence" className="space-y-6 mt-6">
              <ParkedDispatchCard />
              <RecoveryOutcomeCard />
              <div className="grid gap-6 lg:grid-cols-2">
                <ServiceSatisfactionBriefCard />
                <StylistReputationCard />
              </div>
              <FeedbackTrendDriftCard />
              <NegativeFeedbackThemes />
              <NegativeReviewHeatmap />
              <CoachingLoopCard />
              <PraiseWall />
            </TabsContent>

            {/* Settings — consolidated */}
            <TabsContent value="settings" className="mt-6">
              <ReputationSettingsTab />
            </TabsContent>
          </Tabs>
        </ReputationGate>
      </div>
    </DashboardLayout>
  );
}
