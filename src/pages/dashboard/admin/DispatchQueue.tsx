import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw } from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useDispatchQueue, DispatchStatus, DispatchQueueRow } from '@/hooks/useDispatchQueue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';

function StatusBadge({ row }: { row: DispatchQueueRow }) {
  if (row.sent_at) return <Badge>Sent</Badge>;
  if (row.skipped_at) return <Badge variant="secondary">Skipped</Badge>;
  if (row.last_error) return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

export default function DispatchQueue() {
  const { dashPath } = useOrgDashboardPath();
  const qc = useQueryClient();
  const [status, setStatus] = useState<DispatchStatus>('all');
  const [skippedReason, setSkippedReason] = useState<string>('');
  const [running, setRunning] = useState(false);

  const { data: rows, isLoading, refetch } = useDispatchQueue(status, skippedReason || null);

  const distinctReasons = Array.from(new Set((rows ?? []).map((r) => r.skipped_reason).filter(Boolean))) as string[];

  const runDispatcher = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-review-requests', { body: {} });
      if (error) throw error;
      toast.success(`Dispatcher run: ${data?.enqueued ?? 0} enqueued, ${data?.sent ?? 0} sent, ${data?.skipped ?? 0} skipped`);
      qc.invalidateQueries({ queryKey: ['review-dispatch-queue'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Dispatcher failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Dispatch Queue"
          description="Read-only health view of review request sends, skips, and errors. Hourly cron runs at minute 15."
          backTo={dashPath('/admin/feedback')}
          backLabel="Back to Client Reputation"
          actions={
            <Button onClick={runDispatcher} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run Dispatcher Now
            </Button>
          }
        />
        <ComplianceBanner />

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as DispatchStatus)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="errored">Errored</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Skipped reason</label>
                <Input
                  placeholder="e.g. no_phone, no_active_survey"
                  value={skippedReason}
                  onChange={(e) => setSkippedReason(e.target.value)}
                  list="skipped-reasons"
                />
                <datalist id="skipped-reasons">
                  {distinctReasons.map((r) => <option key={r} value={r} />)}
                </datalist>
              </div>
              <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (rows?.length ?? 0) === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No dispatch rows match these filters yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Channel</th>
                      <th className="py-2 pr-4 font-medium">Scheduled</th>
                      <th className="py-2 pr-4 font-medium">Sent</th>
                      <th className="py-2 pr-4 font-medium">Skipped Reason</th>
                      <th className="py-2 pr-4 font-medium">Attempts</th>
                      <th className="py-2 pr-4 font-medium">Last Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows!.map((r) => (
                      <tr key={r.id} className="border-b border-border/40">
                        <td className="py-2 pr-4"><StatusBadge row={r} /></td>
                        <td className="py-2 pr-4 capitalize">{r.channel}</td>
                        <td className="py-2 pr-4">{new Date(r.scheduled_for).toLocaleString()}</td>
                        <td className="py-2 pr-4">{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{r.skipped_reason ?? '—'}</td>
                        <td className="py-2 pr-4">{r.attempts}</td>
                        <td className="py-2 pr-4 text-xs text-destructive max-w-[300px] truncate" title={r.last_error ?? ''}>
                          {r.last_error ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
