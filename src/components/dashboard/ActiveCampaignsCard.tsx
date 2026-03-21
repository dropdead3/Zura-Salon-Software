import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PLATFORM_NAME } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, ChevronRight, CheckCircle2, Rocket, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useActionCampaigns, useUpdateCampaignStatus } from '@/hooks/useActionCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useFormatDate } from '@/hooks/useFormatDate';

export function ActiveCampaignsCard() {
  const { formatDate } = useFormatDate();
  const { data: campaigns, isLoading } = useActionCampaigns('active');
  const updateStatus = useUpdateCampaignStatus();

  const campaignIds = useMemo(() => campaigns?.map(c => c.id) || [], [campaigns]);

  const { data: taskCounts } = useQuery({
    queryKey: ['campaign-task-counts', campaignIds],
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

  if (isLoading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xs tracking-[0.15em]">ACTIVE CAMPAIGNS</h2>
        <Link to="/dashboard/campaigns" className="text-[11px] text-primary hover:underline">
          {campaigns && campaigns.length > 0 ? `View all (${campaigns.length})` : 'View all'}
        </Link>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <Card className="p-6 rounded-xl shadow-md text-center">
          <Target className="w-6 h-6 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-xs text-muted-foreground">No active campaigns</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Launch one from {PLATFORM_NAME} AI insights</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.slice(0, 3).map((campaign) => {
            const counts = taskCounts?.[campaign.id] || { total: 0, done: 0 };
            const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

            return (
              <Link key={campaign.id} to={`/dashboard/campaigns/${campaign.id}`}>
                <Card
                  className="relative overflow-hidden p-4 rounded-2xl shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Rocket className="w-3.5 h-3.5 text-primary shrink-0" />
                        <h3 className="text-sm font-medium truncate">{campaign.name}</h3>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(new Date(campaign.created_at), 'MMM d')}
                        </Badge>
                        {campaign.goal_period && (
                          <span className="text-[11px] text-muted-foreground">{campaign.goal_period}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {counts.done}/{counts.total}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {progress === 100 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateStatus.mutate({ id: campaign.id, status: 'completed' });
                          }}
                          title="Mark complete"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}