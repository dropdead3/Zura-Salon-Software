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
          Recovery SLA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-2xl font-medium">{data.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{data.contacted}</p>
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{data.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
            <div className="border-t border-border/60 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg time to first contact</span>
                <span className="font-medium">{fmtHrs(data.avgFirstContactHours)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg time to resolution</span>
                <span className="font-medium">{fmtHrs(data.avgResolutionHours)}</span>
              </div>
              {data.breachedSLA > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive pt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {data.breachedSLA} task{data.breachedSLA === 1 ? '' : 's'} past 24h SLA
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
