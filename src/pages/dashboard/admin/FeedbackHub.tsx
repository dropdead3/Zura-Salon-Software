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
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFeedbackSurveys } from '@/hooks/useFeedbackSurveys';
import { useStaffFeedbackStats } from '@/hooks/useNPSAnalytics';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useState } from 'react';

export default function FeedbackHub() {
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: surveys } = useFeedbackSurveys(organizationId);
  const { data: staffStats } = useStaffFeedbackStats(organizationId);
  const { data: profile } = useEmployeeProfile();
  const isSuperAdmin = profile?.is_super_admin;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link to="/dashboard/admin/management">
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <NPSScoreCard organizationId={organizationId} />
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Surveys</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-medium">
                    {surveys?.filter(s => s.is_active).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {surveys?.length || 0} total surveys configured
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size={tokens.button.card} className="w-full justify-start gap-2">
                    <Send className="h-4 w-4" />
                    Send Survey Request
                  </Button>
                </CardContent>
              </Card>
            </div>

            <FeedbackResponseList organizationId={organizationId} limit={10} />
          </TabsContent>

          <TabsContent value="responses" className="mt-6">
            <FeedbackResponseList organizationId={organizationId} limit={50} />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Staff Feedback Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {staffStats && Object.keys(staffStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(staffStats).map(([staffId, stats]) => (
                      <div key={staffId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">Staff Member</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.totalResponses} reviews
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium">{stats.avgRating.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Rating</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{stats.avgFriendliness.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Friendliness</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No staff feedback data yet
                  </p>
                )}
              </CardContent>
            </Card>
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
