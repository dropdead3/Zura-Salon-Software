import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle } from 'lucide-react';
import { useRecoverySLA } from '@/hooks/useRecoverySLA';

function fmtHrs(h: number | null) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export function RecoverySLAWidget() {
  const { data, isLoading } = useRecoverySLA();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Unhappy Client Follow-Up
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !data || (data.open + data.contacted + data.resolved) === 0 ? (
          <div className="space-y-2">
            <p className="text-2xl font-medium text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a client gives unhappy feedback, a follow-up task lands here. Reach out within 24 hours to win them back.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-2xl font-medium">{data.open}</p>
                <p className="text-xs text-muted-foreground">Needs reach-out</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{data.contacted}</p>
                <p className="text-xs text-muted-foreground">Talking now</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{data.resolved}</p>
                <p className="text-xs text-muted-foreground">Made it right</p>
              </div>
            </div>
            <div className="border-t border-border/60 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg time to first reach-out</span>
                <span className="font-medium">{fmtHrs(data.avgFirstContactHours)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg time to resolve</span>
                <span className="font-medium">{fmtHrs(data.avgResolutionHours)}</span>
              </div>
              {data.breachedSLA > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive pt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {data.breachedSLA} unhappy client{data.breachedSLA === 1 ? '' : 's'} waiting over 24h
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
