import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useParkedDispatchRows } from '@/hooks/useParkedDispatchRows';

/**
 * Surfaces dispatcher rows auto-parked after 5 failed retries.
 * Renders null when nothing parked (visibility contract).
 */
export function ParkedDispatchCard() {
  const { data, isLoading } = useParkedDispatchRows();

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <Card className="border-destructive/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-destructive" />
          Parked review requests
          <Badge variant="destructive" className="ml-auto">{data.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          These requests failed 5 delivery attempts and were paused. Review the error and decide whether to retry manually or skip.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data.map((row) => (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {row.client_phone || row.client_email || '—'}
                </p>
                <p className="text-muted-foreground truncate mt-0.5">
                  {row.last_error || 'Unknown error'}
                </p>
              </div>
              <div className="text-right text-muted-foreground shrink-0">
                <p>{row.attempts} attempts</p>
                <p className="text-[10px]">
                  {formatDistanceToNow(new Date(row.parked_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
