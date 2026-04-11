/**
 * SEO Campaign Detail Dialog.
 * Full campaign lifecycle management with progress tracking and state transitions.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CAMPAIGN_STATUS_CONFIG, type SEOCampaignStatus } from '@/config/seo-engine/seo-state-machine';
import { TASK_STATUS_CONFIG, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { transitionCampaignStatus } from '@/lib/seo-engine/seo-task-service';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { tokens } from '@/lib/design-tokens';
import { Play, CheckCircle2, Ban, AlertTriangle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  campaign: any;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SEOCampaignDetailDialog({ campaign, organizationId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { data: campaignTasks = [] } = useSEOTasks(organizationId, {
    campaignId: campaign?.id,
  });

  // U5: Fetch location name
  const { data: locationName } = useQuery({
    queryKey: ['location-name', campaign?.location_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('name')
        .eq('id', campaign.location_id)
        .single();
      return data?.name ?? null;
    },
    enabled: !!campaign?.location_id,
  });

  const statusConf = CAMPAIGN_STATUS_CONFIG[campaign?.status as SEOCampaignStatus];

  const stats = useMemo(() => {
    const total = campaignTasks.length;
    const completed = campaignTasks.filter((t: any) => t.status === 'completed').length;
    const overdue = campaignTasks.filter((t: any) => t.status === 'overdue' || t.status === 'escalated').length;
    const active = campaignTasks.filter((t: any) => ['assigned', 'in_progress', 'awaiting_verification'].includes(t.status)).length;
    const blocked = campaignTasks.filter((t: any) => t.status === 'awaiting_dependency').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, active, blocked, pct };
  }, [campaignTasks]);

  if (!campaign) return null;

  const handleTransition = async (newStatus: SEOCampaignStatus) => {
    setIsTransitioning(true);
    try {
      const result = await transitionCampaignStatus({ campaignId: campaign.id, newStatus });
      if (!result.success) throw new Error(result.error);
      qc.invalidateQueries({ queryKey: ['seo-campaigns'] });
      toast({ title: 'Campaign updated', description: `Status changed to ${newStatus}.` });
    } catch (err) {
      toast({ title: 'Transition failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsTransitioning(false);
    }
  };

  const daysRemaining = campaign.window_end
    ? Math.max(0, Math.ceil((new Date(campaign.window_end).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">{campaign.title}</DialogTitle>
          <DialogDescription className="font-sans text-sm">{campaign.objective}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status + dates */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusConf?.variant as any ?? 'outline'}>{statusConf?.label ?? campaign.status}</Badge>
            {locationName && (
              <Badge variant="outline" className="font-sans text-xs">
                📍 {locationName}
              </Badge>
            )}
            {daysRemaining !== null && (
              <Badge variant="outline" className="font-sans text-xs">
                {daysRemaining > 0 ? `${daysRemaining}d remaining` : 'Window closed'}
              </Badge>
            )}
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm font-sans">
                <span>Progress</span>
                <span className="font-display tracking-wide">{stats.pct}%</span>
              </div>
              <Progress value={stats.pct} className="h-2" />
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-display tracking-wide">{stats.completed}</p>
                  <p className="text-[10px] text-muted-foreground font-sans">Done</p>
                </div>
                <div>
                  <p className="text-lg font-display tracking-wide">{stats.active}</p>
                  <p className="text-[10px] text-muted-foreground font-sans">Active</p>
                </div>
                <div>
                  <p className="text-lg font-display tracking-wide text-destructive">{stats.overdue}</p>
                  <p className="text-[10px] text-muted-foreground font-sans">Overdue</p>
                </div>
                <div>
                  <p className="text-lg font-display tracking-wide">{stats.blocked}</p>
                  <p className="text-[10px] text-muted-foreground font-sans">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Task list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {campaignTasks.map((task: any) => {
              const template = SEO_TASK_TEMPLATES[task.template_key];
              const tStatusConf = TASK_STATUS_CONFIG[task.status as SEOTaskStatus];
              const title = task.ai_generated_content?.title ?? template?.label ?? task.template_key;
              return (
                <div key={task.id} className="flex items-center justify-between text-xs font-sans py-1 border-b border-border/40 last:border-0">
                  <span className="truncate">{title}</span>
                  <Badge variant={tStatusConf?.variant as any ?? 'outline'} className="text-[10px] shrink-0 ml-2">
                    {tStatusConf?.label ?? task.status}
                  </Badge>
                </div>
              );
            })}
            {campaignTasks.length === 0 && (
              <p className="text-xs text-muted-foreground font-sans text-center py-4">No tasks in this campaign</p>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {campaign.status === 'planning' && (
              <Button size="sm" onClick={() => handleTransition('active')} disabled={isTransitioning} className="gap-1.5 font-sans">
                <Play className="w-3.5 h-3.5" />
                Activate
              </Button>
            )}
            {(campaign.status === 'active' || campaign.status === 'at_risk') && (
              <Button size="sm" onClick={() => handleTransition('completed')} disabled={isTransitioning} className="gap-1.5 font-sans">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </Button>
            )}
            {campaign.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => handleTransition('blocked')} disabled={isTransitioning} className="gap-1.5 font-sans">
                <AlertTriangle className="w-3.5 h-3.5" />
                Mark Blocked
              </Button>
            )}
            {!['completed', 'abandoned'].includes(campaign.status) && (
              <Button size="sm" variant="outline" onClick={() => handleTransition('abandoned')} disabled={isTransitioning} className="gap-1.5 font-sans text-destructive">
                <Ban className="w-3.5 h-3.5" />
                Abandon
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
