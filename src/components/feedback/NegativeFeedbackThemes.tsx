/**
 * NegativeFeedbackThemes — Operator-triggered AI clustering of negative
 * feedback by root cause (e.g., "front desk wait", "color tone").
 *
 * Doctrine alignment:
 *   - Operator-approved AI surface (Reputation Engine memory).
 *   - Silence on thin signal (<5 negatives → empty state, no fabrication).
 *   - Operator can acknowledge or dismiss each theme; nothing auto-acted.
 *   - Severity color tokens via design system.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  X,
  TrendingUp,
  AlertTriangle,
  Calendar,
  MessageSquareText,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  useDetectFeedbackThemes,
  useLatestFeedbackThemeSnapshot,
  useUpdateThemeClusterStatus,
  type FeedbackThemeCluster,
} from '@/hooks/useFeedbackThemes';

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const CATEGORY_LABEL: Record<string, string> = {
  scheduling: 'Scheduling',
  service_quality: 'Service quality',
  communication: 'Communication',
  facility: 'Facility',
  pricing: 'Pricing',
  front_desk: 'Front desk',
  product: 'Product',
  other: 'Other',
};

export function NegativeFeedbackThemes() {
  const [windowDays, setWindowDays] = useState<number>(90);
  const { data, isLoading } = useLatestFeedbackThemeSnapshot();
  const detect = useDetectFeedbackThemes();
  const updateStatus = useUpdateThemeClusterStatus();

  const snapshot = data?.snapshot;
  const clusters = data?.clusters ?? [];

  const visible = useMemo(
    () => clusters.filter((c) => c.status !== 'dismissed'),
    [clusters],
  );

  const onRun = async () => {
    try {
      const result = await detect.mutateAsync(windowDays);
      if (result?.message) toast.message(result.message);
      else if (result?.clusters?.length === 0) toast.message('No clear themes detected.');
      else toast.success(`Detected ${result?.clusters?.length ?? 0} theme${result?.clusters?.length === 1 ? '' : 's'}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not detect themes';
      if (msg.includes('Rate')) toast.error('AI is busy — try again shortly.');
      else if (msg.includes('credits')) toast.error('AI credits exhausted.');
      else toast.error(msg);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">
                Negative Feedback Themes
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                AI clusters complaints by root cause so you fix the right thing first.
                Operator-approved — nothing auto-acted.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(windowDays)}
              onValueChange={(v) => setWindowDays(Number(v))}
              disabled={detect.isPending}
            >
              <SelectTrigger className="h-9 w-[120px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={onRun}
              disabled={detect.isPending}
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 px-4 rounded-full"
            >
              {detect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : snapshot ? (
                <RefreshCw className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {snapshot ? 'Re-run' : 'Detect themes'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        )}

        {!isLoading && !snapshot && !detect.isPending && (
          <div className="text-center py-8 space-y-2">
            <MessageSquareText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No theme analysis yet. Click <span className="font-medium">Detect themes</span> to
              cluster the last {windowDays} days of negative feedback by root cause.
            </p>
          </div>
        )}

        {snapshot && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(snapshot.created_at), { addSuffix: true })}
                </span>
                <span>·</span>
                <span>
                  {snapshot.response_count} responses · {snapshot.negative_count} negative · last{' '}
                  {snapshot.window_days}d
                </span>
              </div>
              {visible.length > 0 && (
                <Badge variant="outline" className="rounded-full">
                  {visible.length} active theme{visible.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>

            {visible.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No active themes. {clusters.length > 0 && 'All dismissed.'}
                </p>
              </div>
            )}

            {visible.map((cluster) => (
              <ThemeRow
                key={cluster.id}
                cluster={cluster}
                onAcknowledge={() =>
                  updateStatus.mutate({ clusterId: cluster.id, status: 'acknowledged' })
                }
                onDismiss={() =>
                  updateStatus.mutate({ clusterId: cluster.id, status: 'dismissed' })
                }
              />
            ))}

            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/60">
              AI drafted from your feedback. Operator approval required — never auto-acted on.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ThemeRow({
  cluster,
  onAcknowledge,
  onDismiss,
}: {
  cluster: FeedbackThemeCluster;
  onAcknowledge: () => void;
  onDismiss: () => void;
}) {
  const sharePct =
    cluster.share_of_negative != null
      ? Math.round(cluster.share_of_negative * 100)
      : null;
  const isAck = cluster.status === 'acknowledged';

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 transition-colors ${
        isAck ? 'border-border/40 bg-muted/30 opacity-75' : 'border-border/60 bg-card/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-primary shrink-0 mt-0.5">
            #{cluster.rank}
          </span>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{cluster.theme_label}</p>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-full ${SEVERITY_BADGE[cluster.severity]}`}
              >
                {cluster.severity === 'high' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                {cluster.severity}
              </Badge>
              {cluster.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
                  {CATEGORY_LABEL[cluster.category] || cluster.category}
                </Badge>
              )}
              {isAck && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
                  <Check className="h-2.5 w-2.5 mr-0.5" /> Acknowledged
                </Badge>
              )}
            </div>
            {cluster.evidence_quote && (
              <p className="text-xs text-muted-foreground italic">
                "{cluster.evidence_quote}"
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isAck && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAcknowledge}
              className="h-7 px-2 text-xs gap-1"
            >
              <Check className="h-3 w-3" /> Acknowledge
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground pl-6">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {cluster.response_count} mention{cluster.response_count === 1 ? '' : 's'}
          {sharePct != null && ` · ${sharePct}% of negatives`}
        </span>
      </div>

      {cluster.suggested_action && (
        <div className="rounded-md bg-muted/50 px-3 py-2 ml-6">
          <p className="text-xs">
            <span className="font-medium text-foreground">Suggested action: </span>
            <span className="text-muted-foreground">{cluster.suggested_action}</span>
          </p>
        </div>
      )}
    </div>
  );
}
