import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PLATFORM_NAME } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle2, Archive, ChevronRight, Target, Loader2, Calendar } from 'lucide-react';
import { useActionCampaigns } from '@/hooks/useActionCampaigns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

const statusIcon: Record<string, typeof Rocket> = {
  active: Rocket,
  completed: CheckCircle2,
  archived: Archive,
};

const statusBadge: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  archived: 'bg-muted text-muted-foreground border-border',
};

export function CampaignsTabContent() {
  const { formatDate } = useFormatDate();
  const { data: campaigns, isLoading } = useActionCampaigns();

  const campaignIds = campaigns?.map(c => c.id) || [];
  const { data: taskCounts } = useQuery({
    queryKey: ['campaign-task-counts-analytics', campaignIds],
    queryFn: async () => {
      if (campaignIds.length === 0) return {};
      const { data, error } = await supabase
        .from('action_campaign_tasks')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);
      if (error) throw error;
      const counts: Record<string, { total: number; done: number }> = {};
      (data || []).forEach((t) => {
        if (!counts[t.campaign_id]) counts[t.campaign_id] = { total: 0, done: 0 };
        counts[t.campaign_id].total++;
        if (t.status === 'done') counts[t.campaign_id].done++;
      });
      return counts;
    },
    enabled: campaignIds.length > 0,
  });

  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
  const completedCampaigns = campaigns?.filter(c => c.status === 'completed') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-medium">{campaigns?.length || 0}</p>
        </Card>
        <Card className="p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-medium text-primary">{activeCampaigns.length}</p>
        </Card>
        <Card className="p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-medium text-chart-2">{completedCampaigns.length}</p>
        </Card>
        <Card className="p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Avg Completion</p>
          <p className="text-2xl font-medium">
            {campaigns?.length
              ? Math.round(
                  campaigns.reduce((acc, c) => {
                    const ct = taskCounts?.[c.id] || { total: 0, done: 0 };
                    return acc + (ct.total > 0 ? (ct.done / ct.total) * 100 : 0);
                  }, 0) / campaigns.length
                )
              : 0}%
          </p>
        </Card>
      </div>

      {/* Campaign List */}
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-base">All Campaigns</CardTitle>
            <CardDescription>Created from {PLATFORM_NAME} AI insights</CardDescription>
          </div>
          <Button variant="outline" size={tokens.button.card} asChild>
            <Link to="/dashboard/campaigns">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!campaigns?.length ? (
            <div className="text-center py-12 space-y-3">
              <Target className="w-8 h-8 mx-auto text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 10).map((campaign) => {
                const counts = taskCounts?.[campaign.id] || { total: 0, done: 0 };
                const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
                const Icon = statusIcon[campaign.status] || Rocket;

                return (
                  <Link key={campaign.id} to={`/dashboard/campaigns/${campaign.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                      <Icon className={cn('w-4 h-4 shrink-0', campaign.status === 'completed' ? 'text-chart-2' : 'text-primary')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{campaign.name}</span>
                          <Badge variant="outline" className={cn('text-[10px]', statusBadge[campaign.status])}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={progress} className="h-1 flex-1 max-w-[120px]" />
                          <span className="text-[11px] text-muted-foreground">{counts.done}/{counts.total}</span>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDate(new Date(campaign.created_at), 'MMM d')}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
