// ============================================================
// AI Audit Trail
// ----------------------------------------------------------------
// Account-Owner / Platform-only governance surface for the
// hybrid capability layer. Two tabs:
//
//  • Audit  — every proposed / executed / failed action, with
//             actor, capability, params, reasoning, result.
//  • Kill Switches — toggle individual capabilities on/off
//             org-wide in real time.
//
// Strict tenant isolation: queries scope to organization_id and
// rely on RLS as the second layer of defense.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, History, Power, RefreshCcw, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface AuditRow {
  id: string;
  created_at: string;
  executed_at: string | null;
  user_id: string;
  capability_id: string;
  status: 'proposed' | 'approved' | 'denied' | 'executed' | 'failed';
  reasoning: string | null;
  params: Record<string, unknown>;
  error: string | null;
  result: unknown;
}

interface CapabilityRow {
  id: string;
  category: string;
  display_name: string;
  description: string;
  mutation: boolean;
  risk_level: 'low' | 'med' | 'high';
  enabled: boolean;
}

interface KillSwitchRow {
  capability_id: string;
  disabled: boolean;
  reason: string | null;
  updated_at: string;
}

const STATUS_COLOR: Record<AuditRow['status'], string> = {
  proposed: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-500/15 text-blue-600',
  denied: 'bg-stone-500/15 text-stone-600',
  executed: 'bg-emerald-500/15 text-emerald-700',
  failed: 'bg-red-500/15 text-red-700',
};

const RISK_COLOR: Record<CapabilityRow['risk_level'], string> = {
  low: 'bg-emerald-500/15 text-emerald-700',
  med: 'bg-amber-500/15 text-amber-700',
  high: 'bg-red-500/15 text-red-700',
};

// ============================================================
// Page
// ============================================================
export default function AIAuditTrail() {
  const { roles, isPlatformUser, user } = useAuth();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const isSuperAdmin = roles.includes('super_admin');
  const canManage = isSuperAdmin || isPlatformUser || isPrimaryOwner;

  // Account-Owner / Platform only.
  if (!user) return <Navigate to="/auth" replace />;
  if (!canManage) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="AI Audit Trail"
        description="Every action proposed, approved, executed, or refused by the agent."
      />
      <div className="px-4 md:px-8 py-6 max-w-[1600px] mx-auto">
        <AnomalyBanner orgId={orgId} />
        <Tabs defaultValue="audit" className="w-full">
          <ResponsiveTabsList>
            <TabsTrigger value="audit">
              <History className="w-4 h-4 mr-2" />
              Action Log
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Anomalies
            </TabsTrigger>
            <TabsTrigger value="killswitches">
              <Power className="w-4 h-4 mr-2" />
              Kill Switches
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="audit" className="mt-6">
            <AuditLogPanel orgId={orgId} />
          </TabsContent>

          <TabsContent value="anomalies" className="mt-6">
            <AnomalyPanel orgId={orgId} />
          </TabsContent>

          <TabsContent value="killswitches" className="mt-6">
            <KillSwitchPanel orgId={orgId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// Audit Log
// ============================================================
function AuditLogPanel({ orgId }: { orgId: string | undefined }) {
  const { data: rows, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-audit', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from('ai_action_audit')
        .select('id, created_at, executed_at, user_id, capability_id, status, reasoning, params, error, result')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set((rows || []).map((r) => r.user_id))).filter(Boolean),
    [rows],
  );

  const { data: profiles } = useQuery({
    queryKey: ['ai-audit-actors', orgId, userIds.join(',')],
    enabled: userIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .eq('organization_id', orgId!)
        .in('user_id', userIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p.display_name || p.full_name || p.user_id.slice(0, 8);
      });
      return map;
    },
  });

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Action Log</CardTitle>
            <CardDescription>
              Last 200 capability calls. Failed and denied entries surface security signals.
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAuditCsv(rows || [], profiles || {})}
            disabled={!rows?.length}
            className="rounded-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No agent activity yet for this organization.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="border border-border/60 rounded-lg p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${STATUS_COLOR[row.status]} font-sans capitalize`}>
                      {row.status}
                    </Badge>
                    <code className="text-xs font-mono text-foreground">{row.capability_id}</code>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Actor: <span className="text-foreground">{profiles?.[row.user_id] || row.user_id.slice(0, 8)}</span>
                </p>
                {row.reasoning && (
                  <p className="text-sm text-muted-foreground italic">"{row.reasoning}"</p>
                )}
                {row.error && (
                  <p className="text-sm text-red-600 mt-1">Error: {row.error}</p>
                )}
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View parameters
                  </summary>
                  <pre className="mt-2 text-xs bg-muted/40 rounded p-2 overflow-x-auto">
                    {JSON.stringify(row.params, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Kill Switches
// ============================================================
function KillSwitchPanel({ orgId }: { orgId: string | undefined }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: capabilities, isLoading: capsLoading } = useQuery({
    queryKey: ['ai-capabilities-all'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CapabilityRow[]> => {
      const { data, error } = await supabase
        .from('ai_capabilities')
        .select('id, category, display_name, description, mutation, risk_level, enabled')
        .order('category', { ascending: true });
      if (error) throw error;
      return (data || []) as CapabilityRow[];
    },
  });

  const { data: killRows, isLoading: ksLoading } = useQuery({
    queryKey: ['ai-kill-switches', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<KillSwitchRow[]> => {
      const { data, error } = await supabase
        .from('ai_capability_kill_switches')
        .select('capability_id, disabled, reason, updated_at')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return (data || []) as KillSwitchRow[];
    },
  });

  const killedById = useMemo(() => {
    const m: Record<string, KillSwitchRow> = {};
    (killRows || []).forEach((k) => { m[k.capability_id] = k; });
    return m;
  }, [killRows]);

  const toggle = useMutation({
    mutationFn: async ({ capabilityId, disable }: { capabilityId: string; disable: boolean }) => {
      if (!orgId || !user) throw new Error('Missing org / user.');
      // Upsert by composite key
      const { error } = await supabase
        .from('ai_capability_kill_switches')
        .upsert({
          organization_id: orgId,
          capability_id: capabilityId,
          disabled: disable,
          disabled_by: user.id,
          reason: disable ? 'Disabled by Account Owner' : null,
        }, { onConflict: 'organization_id,capability_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ai-kill-switches', orgId] });
      toast.success(vars.disable ? 'Capability disabled.' : 'Capability re-enabled.');
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Failed to update kill switch.');
    },
  });

  const grouped = useMemo(() => {
    const g: Record<string, CapabilityRow[]> = {};
    (capabilities || []).forEach((c) => { (g[c.category] ||= []).push(c); });
    return g;
  }, [capabilities]);

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border rounded-xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Power className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Capability Kill Switches</CardTitle>
            <CardDescription>
              Disable any AI action immediately. Affects all users in this organization. Reversible.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {capsLoading || ksLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, caps]) => (
              <div key={category}>
                <h3 className="font-display text-xs tracking-wider uppercase text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {caps.map((cap) => {
                    const kill = killedById[cap.id];
                    const isDisabled = !!kill?.disabled;
                    return (
                      <div
                        key={cap.id}
                        className="flex items-center justify-between gap-4 border border-border/60 rounded-lg p-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm text-foreground">{cap.display_name}</span>
                            {cap.mutation && (
                              <Badge className={`${RISK_COLOR[cap.risk_level]} font-sans uppercase text-[10px] tracking-wider`}>
                                {cap.risk_level}
                              </Badge>
                            )}
                            <code className="text-xs font-mono text-muted-foreground">{cap.id}</code>
                          </div>
                          <p className="text-sm text-muted-foreground">{cap.description}</p>
                          {isDisabled && kill?.reason && (
                            <p className="text-xs text-red-600 mt-1">Disabled: {kill.reason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {isDisabled ? 'Disabled' : 'Active'}
                          </span>
                          <Switch
                            checked={!isDisabled}
                            disabled={toggle.isPending}
                            onCheckedChange={(checked) =>
                              toggle.mutate({ capabilityId: cap.id, disable: !checked })
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// CSV Export Helper
// ============================================================
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportAuditCsv(rows: AuditRow[], actorMap: Record<string, string>) {
  if (!rows.length) return;
  const headers = [
    'created_at', 'executed_at', 'status', 'capability_id',
    'actor', 'actor_id', 'reasoning', 'error', 'params', 'result',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.created_at,
      r.executed_at ?? '',
      r.status,
      r.capability_id,
      actorMap[r.user_id] ?? '',
      r.user_id,
      r.reasoning ?? '',
      r.error ?? '',
      JSON.stringify(r.params ?? {}),
      JSON.stringify(r.result ?? null),
    ].map(csvEscape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} audit rows.`);
}

// ============================================================
// Anomalies
// ============================================================
interface AnomalyRow {
  id: string;
  organization_id: string;
  user_id: string;
  anomaly_type:
    | 'rate_limit_hit'
    | 'repeated_denials'
    | 'kill_switch_attempt'
    | 'permission_denied_burst'
    | 'high_risk_burst'
    | 'invalid_param_burst';
  capability_id: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
}

const ANOMALY_LABEL: Record<AnomalyRow['anomaly_type'], string> = {
  rate_limit_hit: 'Rate limit hit',
  repeated_denials: 'Repeated denials',
  kill_switch_attempt: 'Disabled-action attempt',
  permission_denied_burst: 'Permission denied',
  high_risk_burst: 'High-risk burst',
  invalid_param_burst: 'Invalid parameter burst',
};

const SEVERITY_COLOR: Record<AnomalyRow['severity'], string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-500/15 text-amber-700',
  high: 'bg-orange-500/15 text-orange-700',
  critical: 'bg-red-500/15 text-red-700',
};

function useAnomalies(orgId: string | undefined, includeAck = false) {
  return useQuery({
    queryKey: ['ai-anomalies', orgId, includeAck],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<AnomalyRow[]> => {
      let q = supabase
        .from('ai_action_anomalies' as any)
        .select('id, organization_id, user_id, anomaly_type, capability_id, severity, details, count, first_seen_at, last_seen_at, acknowledged_at')
        .eq('organization_id', orgId!)
        .order('last_seen_at', { ascending: false })
        .limit(100);
      if (!includeAck) q = q.is('acknowledged_at', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AnomalyRow[];
    },
  });
}

function AnomalyBanner({ orgId }: { orgId: string | undefined }) {
  const { data } = useAnomalies(orgId, false);
  const unack = data?.length ?? 0;
  if (!unack) return null;
  const critical = data!.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-medium text-foreground">{unack}</span> unreviewed AI anomal{unack === 1 ? 'y' : 'ies'} detected
        {critical > 0 && <> — <span className="text-red-700">{critical} high-severity</span></>}.
        Review on the Anomalies tab.
      </div>
    </div>
  );
}

function AnomalyPanel({ orgId }: { orgId: string | undefined }) {
  const queryClient = useQueryClient();
  const [includeAck, setIncludeAck] = useState(false);
  const { data: rows, isLoading } = useAnomalies(orgId, includeAck);

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('acknowledge_ai_anomaly' as any, { p_anomaly: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-anomalies', orgId] });
      toast.success('Anomaly acknowledged.');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to acknowledge.'),
  });

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Anomalies</CardTitle>
            <CardDescription>
              Suspicious patterns detected across rate limits, denials, and disabled-action attempts.
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Show acknowledged</span>
          <Switch checked={includeAck} onCheckedChange={setIncludeAck} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-3" />
            <p className="text-sm text-muted-foreground">No anomalies. Agent activity looks healthy.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="border border-border/60 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${SEVERITY_COLOR[row.severity]} font-sans uppercase text-[10px] tracking-wider`}>
                      {row.severity}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {ANOMALY_LABEL[row.anomaly_type]}
                    </span>
                    {row.capability_id && (
                      <code className="text-xs font-mono text-muted-foreground">{row.capability_id}</code>
                    )}
                    {row.count > 1 && (
                      <Badge variant="secondary" className="text-xs">×{row.count}</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(row.last_seen_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Actor: <span className="text-foreground">{row.user_id.slice(0, 8)}</span>
                </p>
                {Object.keys(row.details ?? {}).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View details
                    </summary>
                    <pre className="mt-2 text-xs bg-muted/40 rounded p-2 overflow-x-auto">
                      {JSON.stringify(row.details, null, 2)}
                    </pre>
                  </details>
                )}
                <div className="mt-3 flex justify-end">
                  {row.acknowledged_at ? (
                    <Badge variant="outline" className="text-xs">
                      Acknowledged {formatDistanceToNow(new Date(row.acknowledged_at), { addSuffix: true })}
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => acknowledge.mutate(row.id)}
                      disabled={acknowledge.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

