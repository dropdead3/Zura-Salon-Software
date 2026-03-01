import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitMerge, History, Undo2, Loader2 } from 'lucide-react';
import { MergeWizard } from '@/components/dashboard/clients/merge/MergeWizard';
import { useMergeAuditLog, useUndoMerge } from '@/hooks/useClientMerge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';

export default function MergeClients() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedIds = searchParams.get('clientIds')?.split(',').filter(Boolean);
  const [activeTab, setActiveTab] = useState(preselectedIds?.length ? 'merge' : 'merge');
  const { effectiveOrganization } = useOrganizationContext();
  const { data: auditLogs, isLoading: logsLoading } = useMergeAuditLog(effectiveOrganization?.id);
  const undoMerge = useUndoMerge();

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Merge Clients"
          description="Consolidate duplicate client profiles safely"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="merge" className="gap-2">
              <GitMerge className="w-4 h-4" />
              Merge
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
              {auditLogs?.length ? (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {auditLogs.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merge" className="mt-6">
            <MergeWizard
              preselectedClientIds={preselectedIds}
              onComplete={() => setActiveTab('history')}
              onCancel={() => navigate('/dashboard/clients')}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base tracking-wide">Merge Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !auditLogs?.length ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No merge history yet.</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log: any) => {
                      const canUndo = !log.is_undone && new Date(log.undo_expires_at) > new Date();
                      const daysLeft = Math.max(0, Math.ceil(
                        (new Date(log.undo_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      ));

                      return (
                        <div key={log.id} className="flex items-center gap-4 p-4 rounded-lg border">
                          <GitMerge className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              Merged {(log.secondary_client_ids || []).length + 1} profiles
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.performed_at), 'MMM d, yyyy h:mm a')}
                            </p>
                            {log.reparenting_counts && (
                              <div className="flex gap-2 mt-1">
                                {Object.entries(log.reparenting_counts as Record<string, number>)
                                  .filter(([, count]) => count > 0)
                                  .slice(0, 4)
                                  .map(([table, count]) => (
                                    <Badge key={table} variant="secondary" className="text-[10px]">
                                      {table}: {count}
                                    </Badge>
                                  ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {log.is_undone ? (
                              <Badge variant="outline" className="text-xs">Undone</Badge>
                            ) : canUndo ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => undoMerge.mutate(log.id)}
                                disabled={undoMerge.isPending}
                                className="gap-1 text-xs"
                              >
                                <Undo2 className="w-3 h-3" />
                                Undo ({daysLeft}d left)
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Permanent</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
