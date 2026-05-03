import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MessageSquareText, BarChart3, Users, Send, Star, Settings, ArrowLeft } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { NPSScoreCard } from '@/components/feedback/NPSScoreCard';
import { FeedbackResponseList } from '@/components/feedback/FeedbackResponseList';
import { ReviewThresholdSettings } from '@/components/feedback/ReviewThresholdSettings';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';
import { RecoverySLAWidget } from '@/components/feedback/RecoverySLAWidget';
import { ComplianceExportButton } from '@/components/feedback/ComplianceExportButton';
import { StylistReputationCard } from '@/components/feedback/StylistReputationCard';
import { ServiceSatisfactionBriefCard } from '@/components/feedback/ServiceSatisfactionBriefCard';
import { ParkedDispatchCard } from '@/components/feedback/ParkedDispatchCard';
import { NegativeReviewHeatmap } from '@/components/feedback/NegativeReviewHeatmap';
import { AIWeeklyFeedbackSummary } from '@/components/feedback/AIWeeklyFeedbackSummary';
import { RecoveryOutcomeCard } from '@/components/feedback/RecoveryOutcomeCard';
import { TodaysMustTouchStrip } from '@/components/feedback/TodaysMustTouchStrip';
import { ResponseRateCard, PublicConversionCard } from '@/components/feedback/ReviewFunnelCards';
import { StaffFeedbackSummary } from '@/components/feedback/StaffFeedbackSummary';
import { FeedbackTrendDriftCard } from '@/components/feedback/FeedbackTrendDriftCard';
import { CoachingLoopCard } from '@/components/feedback/CoachingLoopCard';
import { PraiseWall } from '@/components/feedback/PraiseWall';
import { NegativeFeedbackThemes } from '@/components/feedback/NegativeFeedbackThemes';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useState } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


export default function FeedbackHub() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profile } = useEmployeeProfile();
  const isSuperAdmin = profile?.is_super_admin;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link to={dashPath('/admin/management')}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-medium flex items-center gap-2">
                <MessageSquareText className="h-6 w-6 text-primary" />
                Client Feedback
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Track NPS scores, reviews, and client satisfaction
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="responses" className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              Responses
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" />
              By Staff
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Review Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <TodaysMustTouchStrip />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <NPSScoreCard organizationId={organizationId} />
              <RecoverySLAWidget />
              <ResponseRateCard />
              <PublicConversionCard />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Reputation Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Button asChild variant="outline" size={tokens.button.card} className="justify-start gap-2">
                  <Link to={dashPath('/admin/feedback/recovery')}>
                    <Send className="h-4 w-4" /> Recovery Inbox
                  </Link>
                </Button>
                <Button asChild variant="outline" size={tokens.button.card} className="justify-start gap-2">
                  <Link to={dashPath('/admin/feedback/links')}>
                    <Star className="h-4 w-4" /> Review Links
                  </Link>
                </Button>
                <Button asChild variant="outline" size={tokens.button.card} className="justify-start gap-2">
                  <Link to={dashPath('/admin/feedback/automations')}>
                    <Settings className="h-4 w-4" /> Automations
                  </Link>
                </Button>
                <Button asChild variant="outline" size={tokens.button.card} className="justify-start gap-2">
                  <Link to={dashPath('/admin/feedback/templates')}>
                    <MessageSquareText className="h-4 w-4" /> Templates
                  </Link>
                </Button>
                <Button asChild variant="outline" size={tokens.button.card} className="justify-start gap-2">
                  <Link to={dashPath('/admin/feedback/dispatch')}>
                    <BarChart3 className="h-4 w-4" /> Dispatch Queue
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <ComplianceExportButton />
            </div>
            <ComplianceBanner />

            <ParkedDispatchCard />

            <RecoveryOutcomeCard />

            <AIWeeklyFeedbackSummary />

            <div className="grid gap-6 lg:grid-cols-2">
              <ServiceSatisfactionBriefCard />
              <StylistReputationCard />
            </div>

            <FeedbackTrendDriftCard />

            <NegativeFeedbackThemes />

            <NegativeReviewHeatmap />

            <CoachingLoopCard />

            <PraiseWall />

            <FeedbackResponseList organizationId={organizationId} limit={10} />
          </TabsContent>

          <TabsContent value="responses" className="mt-6">
            <FeedbackResponseList organizationId={organizationId} limit={50} />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffFeedbackSummary organizationId={organizationId} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="settings" className="mt-6">
              <ReviewThresholdSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
