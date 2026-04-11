/**
 * SEO Campaign Detail Dialog.
 * Goal-oriented view with progress ring, collapsed task checklist, and impact rollup.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CAMPAIGN_STATUS_CONFIG, type SEOCampaignStatus } from '@/config/seo-engine/seo-state-machine';
import { TASK_STATUS_CONFIG, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { transitionCampaignStatus } from '@/lib/seo-engine/seo-task-service';
import { IMPACT_CATEGORY_LABELS } from '@/lib/seo-engine/seo-impact-tracker';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { useSEOTaskImpact } from '@/hooks/useSEOTaskActions';
import { tokens } from '@/lib/design-tokens';
import { Play, CheckCircle2, Ban, AlertTriangle, MapPin, ChevronDown, ChevronRight, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  campaign: any;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** SVG progress ring component */
function ProgressRing({ pct, size = 80, strokeWidth = 6 }: { pct: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export function SEOCampaignDetailDialog({ campaign, organizationId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  const { data: campaignTasks = [] } = useSEOTasks(organizationId, {
    campaignId: campaign?.id,
  });

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

  // Aggregate impact from completed tasks
  const completedTaskIds = useMemo(
    () => campaignTasks.filter((t: any) => t.status === 'completed').map((t: any) => t.id),
    [campaignTasks]
  );

  const statusConf = CAMPAIGN_STATUS_CONFIG[campaign?.status as SEOCampaignStatus];

  const stats = useMemo(() => {
    const total = campaignTasks.length;
    const completed = campaignTasks.filter((t: any) => t.status === 'completed').length;
    const overdue = campaignTasks.filter((t: any) => t.status === 'overdue' || t.status === 'escalated').length;
    const active = campaignTasks.filter((t: any) => ['assigned', 'in_progress', 'awaiting_verification'].includes(t.status)).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, active, pct };
  }, [campaignTasks]);

  // Group tasks by template for a goal-oriented checklist
  const tasksByTemplate = useMemo(() => {
    const groups: Record<string, { templateKey: string; label: string; total: number; done: number }> = {};
    for (const t of campaignTasks as any[]) {
      const key = t.template_key;
      if (!groups[key]) {
        const tmpl = SEO_TASK_TEMPLATES[key];
        groups[key] = { templateKey: key, label: tmpl?.label ?? key, total: 0, done: 0 };
      }
      groups[key].total++;
      if (t.status === 'completed') groups[key].done++;
    }
    return Object.values(groups);
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
          {campaign.objective && (
            <DialogDescription className="font-sans text-sm">{campaign.objective}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusConf?.variant ?? 'outline'} className={statusConf?.className}>
              {statusConf?.label ?? campaign.status}
            </Badge>
            {locationName && (
              <Badge variant="outline" className="font-sans text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {locationName}
              </Badge>
            )}
            {daysRemaining !== null && (
              <Badge variant="outline" className="font-sans text-xs">
                {daysRemaining > 0 ? `${daysRemaining}d remaining` : 'Window closed'}
              </Badge>
            )}
          </div>

          {/* Goal Progress — Ring + Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-5">
                <div className="relative flex items-center justify-center shrink-0">
                  <ProgressRing pct={stats.pct} />
                  <span className="absolute text-lg font-display tracking-wide">{stats.pct}%</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-sans">
                    <span className="font-display tracking-wide">{stats.completed}</span>
                    <span className="text-muted-foreground"> of {stats.total} actions complete</span>
                  </p>
                  {stats.active > 0 && (
                    <p className="text-xs text-muted-foreground font-sans">{stats.active} in progress</p>
                  )}
                  {stats.overdue > 0 && (
                    <p className="text-xs text-destructive font-sans flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {stats.overdue} overdue
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Checklist — grouped by template */}
          <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground w-full">
                {tasksOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Action Checklist
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {tasksByTemplate.map((group) => (
                <div key={group.templateKey} className="flex items-center justify-between text-xs font-sans py-1 border-b border-border/40 last:border-0">
                  <span className="flex items-center gap-1.5">
                    {group.done === group.total ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <Target className="w-3 h-3 text-muted-foreground" />
                    )}
                    {group.label}
                  </span>
                  <span className="text-muted-foreground">
                    {group.done}/{group.total}
                  </span>
                </div>
              ))}
              {tasksByTemplate.length === 0 && (
                <p className="text-xs text-muted-foreground font-sans text-center py-2">No tasks in this campaign</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Expected Metrics */}
          {campaign.expected_metrics && Object.keys(campaign.expected_metrics).length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-sans">Expected Outcomes</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(campaign.expected_metrics as Record<string, { target: number; unit: string }>).map(([key, val]) => (
                    <Badge key={key} variant="secondary" className="font-sans text-xs">
                      {key.replace(/_/g, ' ')}: +{val.target}{val.unit}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {campaign.status === 'planning' && (
              <Button size="sm" onClick={() => handleTransition('active')} disabled={isTransitioning} className="gap-1.5 font-sans">
                <Play className="w-3.5 h-3.5" /> Activate
              </Button>
            )}
            {(campaign.status === 'active' || campaign.status === 'at_risk') && (
              <Button size="sm" onClick={() => handleTransition('completed')} disabled={isTransitioning} className="gap-1.5 font-sans">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </Button>
            )}
            {campaign.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => handleTransition('blocked')} disabled={isTransitioning} className="gap-1.5 font-sans">
                <AlertTriangle className="w-3.5 h-3.5" /> Mark Blocked
              </Button>
            )}
            {!['completed', 'abandoned'].includes(campaign.status) && (
              <Button size="sm" variant="outline" onClick={() => handleTransition('abandoned')} disabled={isTransitioning} className="gap-1.5 font-sans text-destructive">
                <Ban className="w-3.5 h-3.5" /> Abandon
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
